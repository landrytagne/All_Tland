package com.retrouvit.service;

import com.retrouvit.entity.*;
import com.retrouvit.dto.ReturnRequestResponse;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests de la machine d'états officielle de la collaboration (§25) :
 * MATCH_FOUND → … → CONNECTION_PENDING → CHAT_ACTIVE → PROPOSAL_PENDING →
 * PAYMENT_PENDING → ESCROW_FUNDED → MISSION_READY → MISSION_STARTED →
 * MEETING_IN_PROGRESS → HANDOVER_PENDING → COMPLETED
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ReturnRequest Workflow — Machine d'états officielle (§25)")
class ReturnRequestWorkflowTest {

    @Mock
    private ReturnRequestRepository returnRequestRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RatingRepository ratingRepository;
    @Mock
    private LostObjectRepository lostObjectRepository;
    @Mock
    private FoundObjectRepository foundObjectRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private EscrowRepository escrowRepository;
    @Mock
    private EmailService emailService;
    @Mock
    private com.retrouvit.controller.WebSocketNotificationController wsNotificationController;
    @Mock
    private CollaborationEventRepository eventRepository;
    @Mock
    private PlatformSettingsService platformSettingsService;
    @Mock
    private LocationSharingService locationSharingService;

    @InjectMocks
    private ReturnRequestService returnRequestService;

    private ReturnRequest request;
    private User loser;
    private User finder;

    @BeforeEach
    void setUp() throws Exception {
        loser = User.builder().id(1L).name("Jean Dupont").email("jean@test.com")
                .password("x").role(Role.USER).trustScore(50).walletBalance(1_000_000L).build();
        finder = User.builder().id(2L).name("Paul Martin").email("paul@test.com")
                .password("x").role(Role.USER).trustScore(50).walletBalance(0L).build();

        request = ReturnRequest.builder()
                .id(10L)
                .reference("RET-AB12CD34")
                .loser(loser)
                .finder(finder)
                .status(ReturnStatus.MATCH_FOUND)
                .verificationAttempts(0)
                .build();

        // Injecter l'ObjectMapper idEMPotently if needed
        when(returnRequestRepository.findById(10L)).thenReturn(Optional.of(request));
        when(returnRequestRepository.save(any(ReturnRequest.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(platformSettingsService.getSettingAsInt("platform_fee_percent")).thenReturn(15);

        // AUDIT M4 : les opérations wallet sont ATOMIQUES en base — on simule
        // l'effet réel sur les entités pour que les assertions de solde
        // vérifient toujours l'invariant.
        when(userRepository.debitWalletAtomically(anyLong(), anyLong())).thenAnswer(inv -> {
            Long uid = inv.getArgument(0);
            Long amt = inv.getArgument(1);
            User target = uid.equals(loser.getId()) ? loser : finder;
            if (target.getWalletBalance() < amt) return 0;
            target.setWalletBalance(target.getWalletBalance() - amt);
            return 1;
        });
        when(userRepository.creditWalletAtomically(anyLong(), anyLong())).thenAnswer(inv -> {
            Long uid = inv.getArgument(0);
            Long amt = inv.getArgument(1);
            User target = uid.equals(loser.getId()) ? loser : finder;
            target.setWalletBalance(target.getWalletBalance() + amt);
            return 1;
        });
    }

    // ─── Helpers ─────────────────────────────────────────────

    private void advanceTo(ReturnStatus status) {
        request.setStatus(status);
    }

    private Escrow createEscrow(EscrowStatus status) {
        return Escrow.builder().id(99L).reference("ESC-TEST1234")
                .buyer(loser).seller(finder).amount(10_000L).status(status).build();
    }

    // ════════════════════════════════════════════════════════════
    // Transitions happy path (§25)
    // ════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Transitions happy path")
    class HappyPath {

        @Test
        @DisplayName("VERIFIED → CONNECTION_PENDING (via requestConnection, §3)")
        void verified_to_connectionPending() {
            advanceTo(ReturnStatus.VERIFIED);

            ReturnRequestResponse res = returnRequestService.requestConnection(10L, 1L);

            assertThat(res.getStatus()).isEqualTo("CONNECTION_PENDING");
        }

        @Test
        @DisplayName("CONNECTION_PENDING → CHAT_ACTIVE (Finder accepte, §4)")
        void connectionPending_to_chatActive() {
            advanceTo(ReturnStatus.CONNECTION_PENDING);

            ReturnRequestResponse res = returnRequestService.acceptConnection(10L, 2L);

            assertThat(res.getStatus()).isEqualTo("CHAT_ACTIVE");
        }

        @Test
        @DisplayName("CHAT_ACTIVE → PROPOSAL_PENDING (Finder propose montant+RDV, §6)")
        void chatActive_to_proposalPending() {
            advanceTo(ReturnStatus.CHAT_ACTIVE);

            ReturnRequestResponse res = returnRequestService.proposeReturn(
                    10L, 2L, 10_000L,
                    LocalDateTime.now().plusDays(1), "Marché central", 4.05, 9.70);

            assertThat(res.getStatus()).isEqualTo("PROPOSAL_PENDING");
            assertThat(res.getProposedAmount()).isEqualTo(10_000L);
            assertThat(res.getMeetingLocation()).isEqualTo("Marché central");
        }

        @Test
        @DisplayName("PROPOSAL_PENDING → PAYMENT_PENDING (Chercheur accepte, §7)")
        void proposalPending_to_paymentPending() {
            advanceTo(ReturnStatus.PROPOSAL_PENDING);
            request.setProposedAmount(10_000L);

            ReturnRequestResponse res = returnRequestService.acceptProposal(10L, 1L);

            assertThat(res.getStatus()).isEqualTo("PAYMENT_PENDING");
            assertThat(res.getAcceptedAmount()).isEqualTo(10_000L);
        }

        @Test
        @DisplayName("PAYMENT_PENDING → ESCROW_FUNDED (paiement séquestre, §9-10)")
        void paymentPending_to_escrowFunded() {
            advanceTo(ReturnStatus.PAYMENT_PENDING);
            request.setProposedAmount(10_000L);
            request.setAcceptedAmount(10_000L);
            when(escrowRepository.save(any(Escrow.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            ReturnRequestResponse res = returnRequestService.payReward(10L, 1L);

            assertThat(res.getStatus()).isEqualTo("ESCROW_FUNDED");
            // Le wallet du chercheur est débité
            assertThat(loser.getWalletBalance()).isEqualTo(990_000L);
        }

        @Test
        @DisplayName("ESCROW_FUNDED → MISSION_STARTED (double clic géré, §11-12)")
        void escrowFunded_to_missionStarted() {
            advanceTo(ReturnStatus.ESCROW_FUNDED);
            request.setEscrow(createEscrow(EscrowStatus.AWAITING_RETURN));
            when(escrowRepository.save(any(Escrow.class))).thenAnswer(inv -> inv.getArgument(0));

            // 1er appel : ESCROW_FUNDED → MISSION_READY (§11)
            ReturnRequestResponse res1 = returnRequestService.startMission(10L, 1L);
            assertThat(res1.getStatus()).isEqualTo("MISSION_READY");

            // 2e appel : MISSION_READY → MISSION_STARTED (§12)
            ReturnRequestResponse res2 = returnRequestService.startMission(10L, 1L);
            assertThat(res2.getStatus()).isEqualTo("MISSION_STARTED");
        }

        @Test
        @DisplayName("MISSION_STARTED → MEETING_IN_PROGRESS (Finder arrivé, §14)")
        void missionStarted_to_meetingInProgress() {
            advanceTo(ReturnStatus.MISSION_STARTED);

            ReturnRequestResponse res = returnRequestService.markArrival(10L, 2L);

            assertThat(res.getStatus()).isEqualTo("MEETING_IN_PROGRESS");
        }

        @Test
        @DisplayName("Double confirmation → HANDOVER_PENDING puis COMPLETED avec libération AUTO (§16-19)")
        void doubleConfirmation_autoRelease() {
            advanceTo(ReturnStatus.MEETING_IN_PROGRESS);
            request.setAcceptedAmount(10_000L);
            request.setEscrow(createEscrow(EscrowStatus.LOCKED));
            when(escrowRepository.save(any(Escrow.class))).thenAnswer(inv -> inv.getArgument(0));

            // 1re confirmation : Finder (§16)
            ReturnRequestResponse res1 = returnRequestService.confirmHandover(10L, 2L);
            assertThat(res1.getStatus()).isEqualTo("HANDOVER_PENDING");
            assertThat(res1.getFinderReturnConfirmed()).isTrue();

            // 2e confirmation : Chercheur (§17) → libération AUTOMATIQUE (§19)
            ReturnRequestResponse res2 = returnRequestService.confirmHandover(10L, 1L);
            assertThat(res2.getStatus()).isEqualTo("COMPLETED");
            // Commission 15 % lue depuis PlatformSettings
            assertThat(res2.getPlatformFee()).isEqualTo(1_500L);
            assertThat(res2.getPaymentAmount()).isEqualTo(8_500L);
            // Le Finder est crédité
            assertThat(finder.getWalletBalance()).isEqualTo(8_500L);
            // Fin du partage de position (§20) — purge déléguée au LocationSharingService
            verify(locationSharingService, atLeastOnce())
                    .endLocationSharing(any(ReturnRequest.class), anyString());
        }
    }

    // ════════════════════════════════════════════════════════════
    // Sorties parallèles
    // ════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Sorties parallèles")
    class ParallelExits {

        @Test
        @DisplayName("CONNECTION_PENDING → REJECTED (Finder refuse, §4)")
        void connectionPending_to_rejected() {
            advanceTo(ReturnStatus.CONNECTION_PENDING);

            ReturnRequestResponse res = returnRequestService.rejectConnection(10L, 2L);

            assertThat(res.getStatus()).isEqualTo("REJECTED");
        }

        @Test
        @DisplayName("PROPOSAL_PENDING → CHAT_ACTIVE (proposition refusée → retour discussion, §8)")
        void proposalRejected_backToChat() {
            advanceTo(ReturnStatus.PROPOSAL_PENDING);
            request.setProposedAmount(10_000L);

            ReturnRequestResponse res = returnRequestService.rejectProposal(10L, 1L);

            assertThat(res.getStatus()).isEqualTo("CHAT_ACTIVE");
            assertThat(res.getProposedAmount()).isNull();
        }

        @Test
        @DisplayName("Chercheur modifie la proposition (§8) — contre-montant")
        void counterProposal() {
            advanceTo(ReturnStatus.PROPOSAL_PENDING);
            request.setProposedAmount(10_000L);

            ReturnRequestResponse res = returnRequestService.counterProposal(10L, 1L, 8_000L);

            assertThat(res.getStatus()).isEqualTo("PROPOSAL_PENDING");
            assertThat(res.getProposedAmount()).isEqualTo(8_000L);
        }
    }

    // ════════════════════════════════════════════════════════════
    // Tests négatifs
    // ════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Tests négatifs — gardes de la machine d'états")
    class NegativeTests {

        @Test
        @DisplayName("❌ Demande de connexion sans vérification préalable")
        void connection_withoutVerification() {
            advanceTo(ReturnStatus.MATCH_FOUND);

            assertThatThrownBy(() -> returnRequestService.requestConnection(10L, 1L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("vérifiée");
        }

        @Test
        @DisplayName("❌ Proposition avant CHAT_ACTIVE")
        void proposal_beforeChat() {
            advanceTo(ReturnStatus.CONNECTION_PENDING);

            assertThatThrownBy(() -> returnRequestService.proposeReturn(
                    10L, 2L, 10_000L, LocalDateTime.now(), "X", null, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("conversation active");
        }

        @Test
        @DisplayName("❌ Paiement en dehors de PAYMENT_PENDING")
        void pay_wrongStatus() {
            advanceTo(ReturnStatus.CHAT_ACTIVE);

            assertThatThrownBy(() -> returnRequestService.payReward(10L, 1L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Aucun paiement attendu");
        }

        @Test
        @DisplayName("❌ Double paiement (idempotence, §9)")
        void pay_doublePayment() {
            advanceTo(ReturnStatus.ESCROW_FUNDED);

            assertThatThrownBy(() -> returnRequestService.payReward(10L, 1L))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("déjà été sécurisé");
        }

        @Test
        @DisplayName("❌ Mission démarrée par le Finder (§12 : seul le Chercheur démarre)")
        void mission_byFinder_forbidden() {
            advanceTo(ReturnStatus.MISSION_READY);

            assertThatThrownBy(() -> returnRequestService.startMission(10L, 2L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Seul le Chercheur");
        }

        @Test
        @DisplayName("❌ Arrivée avant le démarrage de mission")
        void arrival_beforeMission() {
            advanceTo(ReturnStatus.CHAT_ACTIVE);

            assertThatThrownBy(() -> returnRequestService.markArrival(10L, 2L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("mission démarrée");
        }

        @Test
        @DisplayName("❌ Confirmation par un tiers non partie")
        void confirm_unauthorized() {
            advanceTo(ReturnStatus.MEETING_IN_PROGRESS);

            assertThatThrownBy(() -> returnRequestService.confirmHandover(10L, 99L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("pas partie");
        }

        @Test
        @DisplayName("❌ Notation avant COMPLETED (§21)")
        void rating_beforeCompletion() {
            advanceTo(ReturnStatus.HANDOVER_PENDING);

            assertThatThrownBy(() -> returnRequestService.rateUser(10L, 1L, 5, "Top"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("restitution confirmée");
        }
    }

    // ════════════════════════════════════════════════════════════
    // Idempotence
    // ════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Idempotence")
    class IdempotenceTests {

        @Test
        @DisplayName("❌ Double confirmation du Finder (idempotence par partie)")
        void confirmHandover_doubleByFinder() {
            advanceTo(ReturnStatus.MEETING_IN_PROGRESS);

            returnRequestService.confirmHandover(10L, 2L); // 1re fois OK

            assertThatThrownBy(() -> returnRequestService.confirmHandover(10L, 2L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("déjà confirmé");
        }
    }

    // ════════════════════════════════════════════════════════════
    // Litiges (§22-23)
    // ════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Litiges")
    class DisputeTests {

        @Test
        @DisplayName("Litige gèle l'escrow (§22)")
        void dispute_freezesEscrow() {
            advanceTo(ReturnStatus.MISSION_STARTED);
            request.setEscrow(createEscrow(EscrowStatus.LOCKED));
            when(escrowRepository.save(any(Escrow.class))).thenAnswer(inv -> inv.getArgument(0));

            ReturnRequestResponse res = returnRequestService.fileDispute(10L, 1L, "Objet non conforme");

            assertThat(res.getStatus()).isEqualTo("DISPUTED");
            verify(escrowRepository).save(argThat(e -> e.getStatus() == EscrowStatus.DISPUTED));
        }

        @Test
        @DisplayName("❌ Litige impossible sur transaction terminée")
        void dispute_onCompleted() {
            advanceTo(ReturnStatus.COMPLETED);

            assertThatThrownBy(() -> returnRequestService.fileDispute(10L, 1L, "Trop tard"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("terminée");
        }

        @Test
        @DisplayName("Arbitrage : Chercheur gagne → remboursement (§23)")
        void disputeRefund_toLoser() {
            advanceTo(ReturnStatus.DISPUTED);
            request.setEscrow(createEscrow(EscrowStatus.DISPUTED));
            request.setAcceptedAmount(10_000L);
            loser.setWalletBalance(0L);
            when(escrowRepository.save(any(Escrow.class))).thenAnswer(inv -> inv.getArgument(0));
            when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

            ReturnRequestResponse res = returnRequestService.resolveDispute(10L, "Remboursement accordé", true);

            assertThat(res.getStatus()).isEqualTo("REFUNDED");
            // Le chercheur est recrédité
            assertThat(loser.getWalletBalance()).isEqualTo(10_000L);
        }

        @Test
        @DisplayName("Arbitrage : Finder gagne → déblocage des fonds (§23)")
        void disputeRelease_toFinder() {
            advanceTo(ReturnStatus.DISPUTED);
            request.setEscrow(createEscrow(EscrowStatus.DISPUTED));
            request.setAcceptedAmount(10_000L);
            finder.setWalletBalance(0L);
            when(escrowRepository.save(any(Escrow.class))).thenAnswer(inv -> inv.getArgument(0));
            when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

            ReturnRequestResponse res = returnRequestService.resolveDispute(10L, "Remise prouvée", false);

            assertThat(res.getStatus()).isEqualTo("COMPLETED");
            assertThat(finder.getWalletBalance()).isEqualTo(8_500L); // 10 000 - 15 %
        }
    }

    // ════════════════════════════════════════════════════════════
    // Commission paramétrable (§19)
    // ════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Commission paramétrable")
    class PlatformFee {

        @Test
        @DisplayName("Commission lue depuis PlatformSettings (15 % configuré)")
        void fee_fromSettings() {
            advanceTo(ReturnStatus.MEETING_IN_PROGRESS);
            request.setAcceptedAmount(20_000L);
            request.setEscrow(createEscrow(EscrowStatus.LOCKED));
            when(platformSettingsService.getSettingAsInt("platform_fee_percent")).thenReturn(15);
            when(escrowRepository.save(any(Escrow.class))).thenAnswer(inv -> inv.getArgument(0));

            returnRequestService.confirmHandover(10L, 2L);
            ReturnRequestResponse res = returnRequestService.confirmHandover(10L, 1L);

            assertThat(res.getPlatformFee()).isEqualTo(3_000L);   // 15 %
            assertThat(res.getPaymentAmount()).isEqualTo(17_000L);
        }
    }
}
