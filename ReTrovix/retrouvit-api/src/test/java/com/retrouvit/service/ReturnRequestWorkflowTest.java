package com.retrouvit.service;

import com.retrouvit.controller.WebSocketNotificationController;
import com.retrouvit.dto.ReturnRequestResponse;
import com.retrouvit.entity.*;
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

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ReturnRequest Workflow — Tests de transitions")
class ReturnRequestWorkflowTest {

    @Mock private ReturnRequestRepository returnRequestRepository;
    @Mock private UserRepository userRepository;
    @Mock private RatingRepository ratingRepository;
    @Mock private LostObjectRepository lostObjectRepository;
    @Mock private FoundObjectRepository foundObjectRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private EscrowRepository escrowRepository;
    @Mock private EmailService emailService;
    @Mock private WebSocketNotificationController wsNotificationController;

    @InjectMocks private ReturnRequestService returnRequestService;

    private User owner;
    private User finder;
    private LostObject lostObject;
    private ReturnRequest returnRequest;

    @BeforeEach
    void setUp() {
        owner = User.builder()
                .id(1L).name("Propriétaire").email("owner@test.com")
                .walletBalance(50000L).role(Role.USER).build();

        finder = User.builder()
                .id(2L).name("Trouveur").email("finder@test.com")
                .walletBalance(0L).role(Role.USER).build();

        lostObject = LostObject.builder()
                .id(1L).title("iPhone perdu").category("Électronique")
                .city("Douala").user(owner).status(ObjectStatus.ACTIVE).build();

        returnRequest = ReturnRequest.builder()
                .id(1L).reference("RET-TEST001")
                .lostObject(lostObject).loser(owner).finder(finder)
                .status(ReturnStatus.MATCH_FOUND)
                .platformFeePct(15)
                .build();

        // Default: save() returns the same entity (lenient because not all tests use these)
        lenient().when(returnRequestRepository.save(any(ReturnRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Nested
    @DisplayName("Transitions happy path")
    class HappyPathTransitions {

        @Test
        @DisplayName("OWNER_CONFIRMED → NEGOTIATING (via proposeReward)")
        void proposeReward_fromOwnerConfirmed() {
            returnRequest.setStatus(ReturnStatus.OWNER_CONFIRMED);
            when(returnRequestRepository.findById(1L)).thenReturn(Optional.of(returnRequest));
            when(userRepository.findById(1L)).thenReturn(Optional.of(owner));

            ReturnRequestResponse result = returnRequestService.proposeReward(1L, 1L, 15000L);
            assertThat(result.getStatus()).isEqualTo("NEGOTIATING");
        }

        @Test
        @DisplayName("NEGOTIATING → PAYMENT_LOCKED (via acceptReward)")
        void acceptReward_fromNegotiating() {
            returnRequest.setStatus(ReturnStatus.NEGOTIATING);
            returnRequest.setProposedAmount(15000L);
            when(returnRequestRepository.findById(1L)).thenReturn(Optional.of(returnRequest));
            when(userRepository.findById(2L)).thenReturn(Optional.of(finder));
            when(escrowRepository.save(any(Escrow.class))).thenAnswer(inv -> inv.getArgument(0));

            ReturnRequestResponse result = returnRequestService.acceptReward(1L, 2L, 15000L);
            assertThat(result.getStatus()).isEqualTo("PAYMENT_LOCKED");
        }

        @Test
        @DisplayName("PAYMENT_LOCKED → COLLABORATION_ACTIVE")
        void activateCollaboration_fromPaymentLocked() {
            returnRequest.setStatus(ReturnStatus.PAYMENT_LOCKED);
            when(returnRequestRepository.findById(1L)).thenReturn(Optional.of(returnRequest));
            when(userRepository.findById(1L)).thenReturn(Optional.of(owner));

            ReturnRequestResponse result = returnRequestService.activateCollaboration(1L, 1L);
            assertThat(result.getStatus()).isEqualTo("COLLABORATION_ACTIVE");
        }

        @Test
        @DisplayName("COLLABORATION_ACTIVE → RETURN_IN_PROGRESS")
        void startReturn_fromCollaborationActive() {
            returnRequest.setStatus(ReturnStatus.COLLABORATION_ACTIVE);
            when(returnRequestRepository.findById(1L)).thenReturn(Optional.of(returnRequest));
            when(userRepository.findById(2L)).thenReturn(Optional.of(finder));

            ReturnRequestResponse result = returnRequestService.startReturn(1L, 2L);
            assertThat(result.getStatus()).isEqualTo("RETURN_IN_PROGRESS");
        }

        @Test
        @DisplayName("RETURN_IN_PROGRESS → RETURN_CONFIRMED (both parties)")
        void confirmReturn_bothParties() {
            returnRequest.setStatus(ReturnStatus.RETURN_IN_PROGRESS);
            when(returnRequestRepository.findById(1L)).thenReturn(Optional.of(returnRequest));
            when(userRepository.findById(1L)).thenReturn(Optional.of(owner));
            when(userRepository.findById(2L)).thenReturn(Optional.of(finder));

            returnRequestService.confirmReturn(1L, 1L);
            assertThat(returnRequest.getLoserReturnConfirmed()).isTrue();

            ReturnRequestResponse result = returnRequestService.confirmReturn(1L, 2L);
            assertThat(result.getStatus()).isEqualTo("RETURN_CONFIRMED");
        }

        @Test
        @DisplayName("RETURN_CONFIRMED → RELEASED (via releasePayment)")
        void releasePayment_fromReturnConfirmed() {
            returnRequest.setStatus(ReturnStatus.RETURN_CONFIRMED);
            returnRequest.setAcceptedAmount(15000L);
            Escrow escrow = Escrow.builder().id(1L).status(EscrowStatus.RETURN_CONFIRMED).deadline(java.time.LocalDate.now().plusDays(7)).build();
            returnRequest.setEscrow(escrow);
            when(returnRequestRepository.findById(1L)).thenReturn(Optional.of(returnRequest));
            when(userRepository.findById(1L)).thenReturn(Optional.of(owner));
            when(escrowRepository.save(any(Escrow.class))).thenAnswer(inv -> inv.getArgument(0));

            ReturnRequestResponse result = returnRequestService.releasePayment(1L, 1L);
            assertThat(result.getStatus()).isEqualTo("RELEASED");
        }
    }

    @Nested
    @DisplayName("Tests négatifs")
    class NegativeTests {

        @Test
        @DisplayName("❌ Impossible d'activer la collaboration avant PAYMENT_LOCKED")
        void activateCollaboration_wrongStatus() {
            returnRequest.setStatus(ReturnStatus.COLLABORATION_ACTIVE);
            when(returnRequestRepository.findById(1L)).thenReturn(Optional.of(returnRequest));
            when(userRepository.findById(1L)).thenReturn(Optional.of(owner));

            assertThatThrownBy(() -> returnRequestService.activateCollaboration(1L, 1L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("verrouillage du paiement");
        }

        @Test
        @DisplayName("❌ Impossible de libérer l'escrow avant RETURN_CONFIRMED")
        void releasePayment_wrongStatus() {
            returnRequest.setStatus(ReturnStatus.RETURN_IN_PROGRESS);
            when(returnRequestRepository.findById(1L)).thenReturn(Optional.of(returnRequest));
            when(userRepository.findById(1L)).thenReturn(Optional.of(owner));

            assertThatThrownBy(() -> returnRequestService.releasePayment(1L, 1L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("confirmation du retour");
        }

        @Test
        @DisplayName("❌ Impossible pour un utilisateur non autorisé")
        void confirmReturn_unauthorized() {
            returnRequest.setStatus(ReturnStatus.RETURN_IN_PROGRESS);
            when(returnRequestRepository.findById(1L)).thenReturn(Optional.of(returnRequest));

            assertThatThrownBy(() -> returnRequestService.confirmReturn(1L, 99L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("pas partie");
        }

        @Test
        @DisplayName("❌ Impossible de payer avec solde insuffisant")
        void payReward_insufficientBalance() {
            returnRequest.setStatus(ReturnStatus.REWARD_ACCEPTED);
            returnRequest.setAcceptedAmount(50000L);
            owner.setWalletBalance(10000L);
            when(returnRequestRepository.findById(1L)).thenReturn(Optional.of(returnRequest));
            when(userRepository.findById(1L)).thenReturn(Optional.of(owner));

            assertThatThrownBy(() -> returnRequestService.payReward(1L, 1L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Solde insuffisant");
        }

        @Test
        @DisplayName("❌ Double-release bloqué")
        void releasePayment_doubleRelease() {
            returnRequest.setStatus(ReturnStatus.RETURN_CONFIRMED);
            returnRequest.setAcceptedAmount(15000L);
            Escrow escrow = Escrow.builder().id(1L).status(EscrowStatus.RELEASED).deadline(java.time.LocalDate.now().plusDays(7)).build();
            returnRequest.setEscrow(escrow);
            when(returnRequestRepository.findById(1L)).thenReturn(Optional.of(returnRequest));
            when(userRepository.findById(1L)).thenReturn(Optional.of(owner));

            assertThatThrownBy(() -> returnRequestService.releasePayment(1L, 1L))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("déjà été libéré");
        }
    }

    @Nested
    @DisplayName("Tests de litige")
    class DisputeTests {

        @Test
        @DisplayName("FileDispute bloque l'escrow gelé")
        void fileDispute_freezesEscrow() {
            returnRequest.setStatus(ReturnStatus.RETURN_IN_PROGRESS);
            Escrow escrow = Escrow.builder().id(1L).status(EscrowStatus.LOCKED).deadline(java.time.LocalDate.now().plusDays(7)).build();
            returnRequest.setEscrow(escrow);
            when(returnRequestRepository.findById(1L)).thenReturn(Optional.of(returnRequest));
            when(userRepository.findById(1L)).thenReturn(Optional.of(owner));

            returnRequestService.fileDispute(1L, 1L, "Objet non reçu");

            assertThat(returnRequest.getStatus()).isEqualTo(ReturnStatus.DISPUTED);
            assertThat(escrow.getStatus()).isEqualTo(EscrowStatus.DISPUTED);
        }

        @Test
        @DisplayName("❌ Impossible de signaler un litige sur une transaction terminée")
        void fileDispute_completedTransaction() {
            returnRequest.setStatus(ReturnStatus.RELEASED);
            when(returnRequestRepository.findById(1L)).thenReturn(Optional.of(returnRequest));
            when(userRepository.findById(1L)).thenReturn(Optional.of(owner));

            assertThatThrownBy(() -> returnRequestService.fileDispute(1L, 1L, "test"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("transaction terminée");
        }
    }

    @Nested
    @DisplayName("Tests d'idempotence")
    class IdempotenceTests {

        @Test
        @DisplayName("confirmReturn est idempotent si déjà confirmé par tous")
        void confirmReturn_idempotent() {
            returnRequest.setStatus(ReturnStatus.RETURN_IN_PROGRESS);
            returnRequest.setLoserReturnConfirmed(true);
            returnRequest.setFinderReturnConfirmed(true);
            when(returnRequestRepository.findById(1L)).thenReturn(Optional.of(returnRequest));
            when(userRepository.findById(1L)).thenReturn(Optional.of(owner));

            ReturnRequestResponse result = returnRequestService.confirmReturn(1L, 1L);
            assertThat(result).isNotNull();
        }
    }
}
