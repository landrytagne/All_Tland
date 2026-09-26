package com.retrouvit.service;

import com.retrouvit.controller.WebSocketNotificationController;
import com.retrouvit.dto.CollaborationAdminDetail;
import com.retrouvit.dto.NotificationWsMessage;
import com.retrouvit.dto.RatingResponse;
import com.retrouvit.dto.ReturnRequestResponse;
import com.retrouvit.dto.UserResponse;
import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Flow de restitution officiel — RetrouvIt-Flow-Restitution.md.
 *
 * Machine d'états (§25) :
 * MATCH_FOUND → VERIFICATION_PENDING → VERIFIED → CONNECTION_PENDING →
 * CHAT_ACTIVE → PROPOSAL_PENDING → PAYMENT_PENDING → ESCROW_FUNDED →
 * MISSION_READY → MISSION_STARTED → MEETING_IN_PROGRESS → HANDOVER_PENDING → COMPLETED
 *
 * Points clés du flow :
 * - §6  : le Finder propose montant + date + heure + lieu en une action ;
 * - §12 : « Commencer la mission » = transition automatique, pas de 2e validation ;
 * - §16-18 : double confirmation obligatoire (remise Finder + réception Chercheur) ;
 * - §19 : libération AUTOMATIQUE des fonds après double confirmation,
 *         commission lue depuis PlatformSettings (jamais codée en dur) ;
 * - §13/§20 : partage de position actif pendant la mission uniquement ;
 * - §24 : chaque transition est tracée dans une timeline d'audit.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReturnRequestService {

    private final ReturnRequestRepository returnRequestRepository;
    private final UserRepository userRepository;
    private final RatingRepository ratingRepository;
    private final LostObjectRepository lostObjectRepository;
    private final FoundObjectRepository foundObjectRepository;
    private final NotificationRepository notificationRepository;
    private final TransactionRepository transactionRepository;
    private final EscrowRepository escrowRepository;
    private final EmailService emailService;
    private final WebSocketNotificationController wsNotificationController;
    private final CollaborationEventRepository eventRepository;
    private final PlatformSettingsService platformSettingsService;
    private final LocationSharingService locationSharingService;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ProofRepository proofRepository;
    private final CollaborationLocationRepository locationRepository;

    static final String SETTING_PLATFORM_FEE = "platform_fee_percent";

    // ════════════════════════════════════════════════════════════
    // §1-3 : MATCH_FOUND — création de la collaboration
    // ════════════════════════════════════════════════════════════

    /**
     * Crée la collaboration après détection d'une correspondance.
     * Le Chercheur passe ensuite par la vérification de propriété (§2).
     */
    @Transactional
    public ReturnRequestResponse initiateReturn(Long finderId, Long loserId, Long lostObjectId, Long foundObjectId) {
        if (lostObjectId != null && returnRequestRepository.existsByLostObjectIdAndFinderId(lostObjectId, finderId)) {
            throw new IllegalArgumentException("Une demande de retour existe déjà pour cet objet");
        }

        User loser = userRepository.findById(loserId).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        User finder = userRepository.findById(finderId).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        LostObject lostObject = lostObjectId != null ? lostObjectRepository.findById(lostObjectId).orElse(null) : null;
        FoundObject foundObject = foundObjectId != null ? foundObjectRepository.findById(foundObjectId).orElse(null) : null;

        ReturnRequest request = ReturnRequest.builder()
                .reference("RET-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .lostObject(lostObject)
                .foundObject(foundObject)
                .loser(loser)
                .finder(finder)
                .status(ReturnStatus.MATCH_FOUND)
                .build();

        ReturnRequest saved = returnRequestRepository.save(request);

        // Mark object as FOUND when return process starts
        if (lostObject != null) {
            lostObject.setStatus(ObjectStatus.FOUND);
            lostObjectRepository.save(lostObject);
        }

        addEvent(saved, null, "MATCH_FOUND",
                "Correspondance détectée entre les publications", null);

        // Notify the loser
        notificationRepository.save(Notification.builder()
                .user(loser)
                .type(NotificationType.MATCH)
                .title("Une correspondance a été trouvée")
                .description("Nous avons trouvé un objet qui pourrait correspondre à votre déclaration. Vérifiez votre propriété.")
                .read(false)
                .build());

        // WebSocket push
        pushReturnNotification(saved, "Une correspondance a été trouvée",
                "Vérifiez votre propriété pour demander la restitution.", "MATCH");

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // §4 : CONNECTION_PENDING → accepter / refuser la mise en relation
    // ════════════════════════════════════════════════════════════

    /**
     * Le Chercheur envoie la demande de restitution au Finder (§3),
     * après vérification de propriété réussie.
     */
    @Transactional
    public ReturnRequestResponse requestConnection(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        if (!request.getLoser().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le Chercheur peut demander la mise en relation");
        }
        if (request.getStatus() != ReturnStatus.VERIFIED) {
            throw new IllegalArgumentException(
                    "La propriété doit être vérifiée avant la demande (statut actuel: " + request.getStatus() + ")");
        }

        request.setStatus(ReturnStatus.CONNECTION_PENDING);
        ReturnRequest saved = returnRequestRepository.save(request);

        addEvent(saved, userRepository.findById(userId).orElse(null), "CONNECTION_REQUESTED",
                "Demande de restitution envoyée au Finder", null);

        notificationRepository.save(Notification.builder()
                .user(request.getFinder())
                .type(NotificationType.MATCH)
                .title("Demande de restitution")
                .description("Un utilisateur a correctement répondu à la question de vérification associée à votre objet.")
                .read(false)
                .build());

        pushReturnNotificationToUser(request.getFinder().getId(), saved,
                "Demande de restitution", "Acceptez ou refusez la mise en relation.", "MATCH");

        return toResponse(saved, null);
    }

    /** Le Finder accepte la mise en relation → CHAT_ACTIVE (§4-5). */
    @Transactional
    public ReturnRequestResponse acceptConnection(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        if (!request.getFinder().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le Finder peut accepter la mise en relation");
        }
        if (request.getStatus() != ReturnStatus.CONNECTION_PENDING) {
            throw new IllegalArgumentException(
                    "Aucune demande en attente (statut actuel: " + request.getStatus() + ")");
        }

        request.setStatus(ReturnStatus.CHAT_ACTIVE);
        ReturnRequest saved = returnRequestRepository.save(request);

        addEvent(saved, userRepository.findById(userId).orElse(null), "CONNECTION_ACCEPTED",
                "Mise en relation acceptée — conversation ouverte", null);

        notificationRepository.save(Notification.builder()
                .user(request.getLoser())
                .type(NotificationType.MATCH)
                .title("Mise en relation acceptée")
                .description(request.getFinder().getName() + " a accepté la restitution. La conversation est ouverte.")
                .read(false)
                .build());

        pushReturnNotification(saved, "Mise en relation acceptée",
                "La conversation est ouverte.", "MATCH");

        return toResponse(saved, null);
    }

    /** Le Finder refuse → REJECTED avec motif (§4). */
    @Transactional
    public ReturnRequestResponse rejectConnection(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        if (!request.getFinder().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le Finder peut refuser la mise en relation");
        }
        if (request.getStatus() != ReturnStatus.CONNECTION_PENDING) {
            throw new IllegalArgumentException(
                    "Aucune demande en attente (statut actuel: " + request.getStatus() + ")");
        }

        request.setStatus(ReturnStatus.REJECTED);
        ReturnRequest saved = returnRequestRepository.save(request);

        addEvent(saved, userRepository.findById(userId).orElse(null), "CONNECTION_REJECTED",
                "Restitution refusée par le Finder", null);

        notificationRepository.save(Notification.builder()
                .user(request.getLoser())
                .type(NotificationType.MATCH)
                .title("Restitution refusée")
                .description("Le Finder a refusé la mise en relation pour cette restitution.")
                .read(false)
                .build());

        pushReturnNotificationToUser(request.getLoser().getId(), saved,
                "Restitution refusée", "Le Finder a refusé la mise en relation.", "MATCH");

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // §6-8 : PROPOSAL_PENDING — le Finder propose montant + RDV
    // ════════════════════════════════════════════════════════════

    /**
     * Le Finder envoie une proposition complète : récompense + date + heure
     * + lieu (§6). Une seule action, aucun échange multi-étapes.
     */
    @Transactional
    public ReturnRequestResponse proposeReturn(Long requestId, Long userId, Long amount,
                                               LocalDateTime meetingDate, String location,
                                               Double lat, Double lng) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        if (!request.getFinder().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le Finder peut organiser la restitution");
        }
        if (request.getStatus() != ReturnStatus.CHAT_ACTIVE
                && request.getStatus() != ReturnStatus.PROPOSAL_PENDING) {
            throw new IllegalArgumentException(
                    "La proposition n'est possible qu'une fois la conversation active (statut actuel: "
                            + request.getStatus() + ")");
        }
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Le montant proposé doit être positif");
        }
        if (meetingDate == null) {
            throw new IllegalArgumentException("La date de rendez-vous est obligatoire");
        }
        if (location == null || location.isBlank()) {
            throw new IllegalArgumentException("Le lieu de rendez-vous est obligatoire");
        }

        request.setProposedAmount(amount);
        request.setMeetingDate(meetingDate);
        request.setMeetingLocation(location);
        request.setMeetingLat(lat);
        request.setMeetingLng(lng);
        request.setStatus(ReturnStatus.PROPOSAL_PENDING);
        ReturnRequest saved = returnRequestRepository.save(request);

        addEvent(saved, userRepository.findById(userId).orElse(null), "PROPOSAL_SENT",
                String.format("Proposition : %s XAF — %s à %s",
                        String.format("%,d", amount), meetingDate.toLocalDate(), location),
                null);

        notificationRepository.save(Notification.builder()
                .user(request.getLoser())
                .type(NotificationType.PAYMENT)
                .title("Nouvelle proposition de restitution")
                .description(String.format("Récompense : %s XAF. Date : %s. Lieu : %s.",
                        String.format("%,d", amount),
                        meetingDate.toLocalDate() + " à " + meetingDate.toLocalTime(),
                        location))
                .read(false)
                .build());

        pushReturnNotificationToUser(request.getLoser().getId(), saved,
                "Nouvelle proposition de restitution",
                "Les fonds seront conservés en séquestre jusqu'à la confirmation.", "PAYMENT");

        return toResponse(saved, null);
    }

    /**
     * Le Chercheur modifie la proposition (§8) : contre-montant, retour
     * à la discussion sans créer un nouveau dossier.
     */
    @Transactional
    public ReturnRequestResponse counterProposal(Long requestId, Long userId, Long newAmount) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        if (!request.getLoser().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le Chercheur peut modifier la proposition");
        }
        if (request.getStatus() != ReturnStatus.PROPOSAL_PENDING) {
            throw new IllegalArgumentException(
                    "Aucune proposition en attente (statut actuel: " + request.getStatus() + ")");
        }
        if (newAmount == null || newAmount <= 0) {
            throw new IllegalArgumentException("Le montant doit être positif");
        }

        request.setProposedAmount(newAmount);
        ReturnRequest saved = returnRequestRepository.save(request);

        addEvent(saved, userRepository.findById(userId).orElse(null), "PROPOSAL_COUNTERED",
                "Proposition modifiée par le Chercheur : " + String.format("%,d", newAmount) + " XAF", null);

        notificationRepository.save(Notification.builder()
                .user(request.getFinder())
                .type(NotificationType.PAYMENT)
                .title("Proposition modifiée")
                .description("Le Chercheur propose " + String.format("%,d", newAmount) + " XAF.")
                .read(false)
                .build());

        pushReturnNotificationToUser(request.getFinder().getId(), saved,
                "Proposition modifiée", "Nouveau montant : " + String.format("%,d", newAmount) + " XAF", "PAYMENT");

        return toResponse(saved, null);
    }

    /** Le Chercheur accepte la proposition → PAYMENT_PENDING (§7). */
    @Transactional
    public ReturnRequestResponse acceptProposal(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        if (!request.getLoser().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le Chercheur peut accepter la proposition");
        }
        if (request.getStatus() != ReturnStatus.PROPOSAL_PENDING) {
            throw new IllegalArgumentException(
                    "Aucune proposition en attente (statut actuel: " + request.getStatus() + ")");
        }

        request.setAcceptedAmount(request.getProposedAmount());
        request.setStatus(ReturnStatus.PAYMENT_PENDING);
        ReturnRequest saved = returnRequestRepository.save(request);

        addEvent(saved, userRepository.findById(userId).orElse(null), "PROPOSAL_ACCEPTED",
                "Proposition acceptée par le Chercheur", null);

        pushReturnNotification(saved, "Proposition acceptée",
                "Le paiement peut maintenant être sécurisé.", "PAYMENT");

        return toResponse(saved, null);
    }

    /** Le Chercheur refuse la proposition → retour à la discussion (§8). */
    @Transactional
    public ReturnRequestResponse rejectProposal(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        if (!request.getLoser().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le Chercheur peut refuser la proposition");
        }
        if (request.getStatus() != ReturnStatus.PROPOSAL_PENDING) {
            throw new IllegalArgumentException(
                    "Aucune proposition en attente (statut actuel: " + request.getStatus() + ")");
        }

        // Retour à la discussion, sans créer un nouveau dossier (§8)
        request.setStatus(ReturnStatus.CHAT_ACTIVE);
        request.setProposedAmount(null);
        ReturnRequest saved = returnRequestRepository.save(request);

        addEvent(saved, userRepository.findById(userId).orElse(null), "PROPOSAL_REJECTED",
                "Proposition refusée — retour à la discussion", null);

        pushReturnNotification(saved, "Proposition refusée",
                "Discutez pour trouver un accord.", "MATCH");

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // §9-10 : PAYMENT_PENDING → ESCROW_FUNDED
    // ════════════════════════════════════════════════════════════

    /**
     * Le Chercheur paie : fonds débités et placés en séquestre.
     * Idempotent (protection double-débit). → ESCROW_FUNDED.
     */
    @Transactional
    public ReturnRequestResponse payReward(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        if (!request.getLoser().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le Chercheur peut effectuer le paiement");
        }

        // Idempotence : paiement déjà sécurisé
        if (request.getStatus() == ReturnStatus.ESCROW_FUNDED
                || request.getStatus() == ReturnStatus.MISSION_READY
                || request.getStatus() == ReturnStatus.MISSION_STARTED
                || request.getStatus() == ReturnStatus.MEETING_IN_PROGRESS
                || request.getStatus() == ReturnStatus.HANDOVER_PENDING
                || request.getStatus() == ReturnStatus.COMPLETED) {
            throw new IllegalStateException("Le paiement a déjà été sécurisé pour cette collaboration");
        }

        if (request.getStatus() != ReturnStatus.PAYMENT_PENDING) {
            throw new IllegalArgumentException(
                    "Aucun paiement attendu en statut " + request.getStatus());
        }

        Long amount = request.getAcceptedAmount();
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Montant invalide — acceptez d'abord une proposition");
        }

        User buyer = request.getLoser();
        if (buyer.getWalletBalance() < amount) {
            throw new IllegalArgumentException(
                    "Solde insuffisant (" + String.format("%,d", buyer.getWalletBalance())
                            + " XAF). Rechargez votre portefeuille.");
        }

        // AUDIT M4 : débit ATOMIQUE — la vérification applicative ci-dessus
        // sert au message d'erreur ; la garantie d'intégrité vient de la
        // condition SQL (rows affected = 0 → un paiement concurrent a déjà
        // consommé le solde).
        if (userRepository.debitWalletAtomically(buyer.getId(), amount) == 0) {
            throw new IllegalArgumentException(
                    "Solde insuffisant — une autre opération a peut-être consommé votre solde.");
        }

        // Créer l'escrow
        Escrow escrow = Escrow.builder()
                .reference("ESC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .buyer(request.getLoser())
                .seller(request.getFinder())
                .amount(amount)
                .lostObject(request.getLostObject())
                .foundObject(request.getFoundObject())
                .deadline(java.time.LocalDate.now().plusDays(7))
                .status(EscrowStatus.AWAITING_RETURN)
                .location(request.getMeetingLocation())
                .build();
        Escrow savedEscrow = escrowRepository.save(escrow);

        request.setEscrow(savedEscrow);
        request.setStatus(ReturnStatus.ESCROW_FUNDED);
        ReturnRequest saved = returnRequestRepository.save(request);

        addEvent(saved, userRepository.findById(userId).orElse(null), "PAYMENT_SECURED",
                String.format("Paiement sécurisé : %s XAF en séquestre (%s)",
                        String.format("%,d", amount), savedEscrow.getReference()), null);

        // Transaction record
        transactionRepository.save(Transaction.builder()
                .user(buyer)
                .type(TransactionType.DEPOSIT)
                .amount(amount)
                .status(TransactionStatus.COMPLETED)
                .description("Paiement récompense pour retour d'objet (" + saved.getReference() + ")")
                .build());

        // Notifier le Finder (§10)
        notificationRepository.save(Notification.builder()
                .user(request.getFinder())
                .type(NotificationType.PAYMENT)
                .title("Le paiement a été sécurisé")
                .description(String.format("%s XAF sont placés en séquestre. Vous pouvez maintenant commencer la mission.",
                        String.format("%,d", amount)))
                .read(false)
                .build());

        pushReturnNotification(saved, "Paiement sécurisé",
                String.format("%s XAF en séquestre. Mission prête.", String.format("%,d", amount)), "PAYMENT");

        log.info("Payment secured for return request {}: {} XAF (escrow {})", requestId, amount, savedEscrow.getReference());
        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // §11-12 : ESCROW_FUNDED → MISSION_READY → MISSION_STARTED
    // ════════════════════════════════════════════════════════════

    /**
     * Le Chercheur démarre la mission (§11) — transition unique,
     * le Finder est simplement informé (§12 : pas de seconde validation).
     */
    @Transactional
    public ReturnRequestResponse startMission(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        if (!request.getLoser().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le Chercheur démarre la mission (§12)");
        }

        if (request.getStatus() == ReturnStatus.ESCROW_FUNDED) {
            request.setStatus(ReturnStatus.MISSION_READY);
            ReturnRequest ready = returnRequestRepository.save(request);
            addEvent(ready, null, "MISSION_READY", "Restitution prête — en attente du démarrage", null);
            return toResponse(ready, null);
        }

        if (request.getStatus() != ReturnStatus.MISSION_READY) {
            throw new IllegalArgumentException(
                    "La mission ne peut démarrer qu'après sécurisation du paiement (statut actuel: "
                            + request.getStatus() + ")");
        }

        request.setStatus(ReturnStatus.MISSION_STARTED);
        request.setCollaborationStartedAt(LocalDateTime.now());
        ReturnRequest saved = returnRequestRepository.save(request);

        // Verrouiller l'escrow pendant la mission
        if (request.getEscrow() != null) {
            Escrow escrow = request.getEscrow();
            if (escrow.getStatus() == EscrowStatus.AWAITING_RETURN) {
                escrow.setStatus(EscrowStatus.LOCKED);
                escrow.setProgress(20);
                escrowRepository.save(escrow);
            }
        }

        addEvent(saved, userRepository.findById(userId).orElse(null), "MISSION_STARTED",
                "Mission démarrée — partage de position actif", null);

        // Notification au Finder (§12) — pas de validation supplémentaire
        notificationRepository.save(Notification.builder()
                .user(request.getFinder())
                .type(NotificationType.MATCH)
                .title("Mission démarrée")
                .description("Le Chercheur a confirmé le démarrage de la restitution. La localisation est disponible.")
                .read(false)
                .build());

        pushReturnNotificationToUser(request.getFinder().getId(), saved,
                "Mission démarrée", "Le partage de position est actif jusqu'au rendez-vous.", "MATCH");

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // §14 : MISSION_STARTED → MEETING_IN_PROGRESS (« Je suis arrivé »)
    // ════════════════════════════════════════════════════════════

    /** Le Finder signale son arrivée au rendez-vous (§14). */
    @Transactional
    public ReturnRequestResponse markArrival(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        if (!request.getFinder().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le Finder signale son arrivée");
        }
        if (request.getStatus() != ReturnStatus.MISSION_STARTED) {
            throw new IllegalArgumentException(
                    "L'arrivée ne peut être signalée qu'une fois la mission démarrée (statut actuel: "
                            + request.getStatus() + ")");
        }

        request.setStatus(ReturnStatus.MEETING_IN_PROGRESS);
        ReturnRequest saved = returnRequestRepository.save(request);

        addEvent(saved, userRepository.findById(userId).orElse(null), "FINDER_ARRIVED",
                "Le Finder est arrivé au rendez-vous", null);

        notificationRepository.save(Notification.builder()
                .user(request.getLoser())
                .type(NotificationType.MATCH)
                .title("Le Finder est arrivé")
                .description("Le Finder vient d'arriver au rendez-vous.")
                .read(false)
                .build());

        pushReturnNotificationToUser(request.getLoser().getId(), saved,
                "Le Finder est arrivé", "Vous pouvez procéder à la restitution.", "MATCH");

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // §15-18 : double confirmation obligatoire → HANDOVER_PENDING
    // ════════════════════════════════════════════════════════════

    /**
     * Confirmation individuelle : Finder (« remise », §16) ou Chercheur
     * (« réception », §17). Les deux sont obligatoires (§18) ; quand les
     * deux sont présentes, la libération des fonds est déclenchée
     * AUTOMATIQUEMENT (§19).
     */
    @Transactional
    public ReturnRequestResponse confirmHandover(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        boolean isLoser = request.getLoser().getId().equals(userId);
        boolean isFinder = request.getFinder().getId().equals(userId);

        if (!isLoser && !isFinder) {
            throw new IllegalArgumentException("Vous n'êtes pas partie à cette restitution");
        }

        if (request.getStatus() != ReturnStatus.MEETING_IN_PROGRESS
                && request.getStatus() != ReturnStatus.HANDOVER_PENDING) {
            throw new IllegalArgumentException(
                    "La confirmation n'est pas possible en statut " + request.getStatus());
        }

        // Idempotence par partie
        if (isLoser && Boolean.TRUE.equals(request.getLoserReturnConfirmed())) {
            throw new IllegalArgumentException("Vous avez déjà confirmé la réception");
        }
        if (isFinder && Boolean.TRUE.equals(request.getFinderReturnConfirmed())) {
            throw new IllegalArgumentException("Vous avez déjà confirmé la remise");
        }

        if (isLoser) request.setLoserReturnConfirmed(true);
        if (isFinder) request.setFinderReturnConfirmed(true);

        boolean bothConfirmed = request.isFullyReturned();

        request.setStatus(bothConfirmed ? ReturnStatus.HANDOVER_PENDING : ReturnStatus.HANDOVER_PENDING);
        ReturnRequest saved = returnRequestRepository.save(request);

        User actor = userRepository.findById(userId).orElse(null);
        User other = isLoser ? request.getFinder() : request.getLoser();
        String who = isLoser ? "Le Chercheur" : "Le Finder";

        addEvent(saved, actor,
                isLoser ? "RECEIPT_CONFIRMED" : "HANDOVER_CONFIRMED",
                who + " a confirmé " + (isLoser ? "la réception" : "la remise") + " de l'objet", null);

        notificationRepository.save(Notification.builder()
                .user(other)
                .type(NotificationType.MATCH)
                .title(isLoser ? "Réception confirmée" : "Remise confirmée")
                .description(who + " a confirmé la restitution de l'objet.")
                .read(false)
                .build());

        if (bothConfirmed) {
            // §18-19 : double confirmation → libération AUTOMATIQUE
            addEvent(saved, null, "HANDOVER_FULLY_CONFIRMED",
                    "Double confirmation reçue — libération automatique des fonds", null);
            processAutomaticRelease(saved);
        } else {
            request.setStatus(ReturnStatus.HANDOVER_PENDING);
            saved = returnRequestRepository.save(request);
            pushReturnNotificationToUser(other.getId(), saved,
                    "En attente de l'autre confirmation",
                    "La libération des fonds se fera après les deux confirmations.", "MATCH");
        }

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // §19 : libération automatique des fonds, commission paramétrable
    // ════════════════════════════════════════════════════════════

    /**
     * Libération AUTOMATIQUE après double confirmation (§19).
     * La commission est lue depuis PlatformSettings (back-office) —
     * jamais codée en dur.
     */
    private void processAutomaticRelease(ReturnRequest request) {
        Long acceptedAmount = request.getAcceptedAmount();
        if (acceptedAmount == null) {
            log.warn("Release auto impossible : aucun montant accepté pour {}", request.getReference());
            return;
        }

        int feePct = platformFeePercent();
        long platformFee = acceptedAmount * feePct / 100;
        long finderPayment = acceptedAmount - platformFee;

        request.setPlatformFeePct(feePct);
        request.setPlatformFee(platformFee);
        request.setPaymentAmount(finderPayment);

        // Crédit du wallet Finder (atomique, audit M4)
        User finder = request.getFinder();
        userRepository.creditWalletAtomically(finder.getId(), finderPayment);

        // Transaction
        transactionRepository.save(Transaction.builder()
                .user(finder)
                .type(TransactionType.REWARD)
                .amount(finderPayment)
                .status(TransactionStatus.COMPLETED)
                .description("Récompense pour retour de "
                        + (request.getLostObject() != null ? request.getLostObject().getTitle() : "objet")
                        + " (-" + platformFee + " XAF de frais de plateforme)")
                .build());

        // Escrow libéré
        if (request.getEscrow() != null) {
            Escrow escrow = request.getEscrow();
            escrow.setStatus(EscrowStatus.RELEASED);
            escrow.setProgress(100);
            escrow.setCompletedAt(LocalDateTime.now());
            escrowRepository.save(escrow);
        }

        request.setStatus(ReturnStatus.COMPLETED); // §20 : mission COMPLETED
        request.setReleasedAt(LocalDateTime.now());
        request.setCompletedAt(LocalDateTime.now());
        ReturnRequest saved = returnRequestRepository.save(request);

        addEvent(saved, null, "FUNDS_RELEASED",
                String.format("Fonds libérés : %s XAF versés au Finder (commission %d %% = %s XAF)",
                        String.format("%,d", finderPayment), feePct, String.format("%,d", platformFee)), null);

        // §13/§20 : fin automatique du partage de position (purge des positions)
        locationSharingService.endLocationSharing(saved,
                "Restitution confirmée — partage de position automatiquement désactivé");

        // Update lost object status to RETURNED
        if (request.getLostObject() != null) {
            request.getLostObject().setStatus(ObjectStatus.RETURNED);
            lostObjectRepository.save(request.getLostObject());
        }
        if (request.getFoundObject() != null) {
            request.getFoundObject().setStatus(ObjectStatus.RETURNED);
            foundObjectRepository.save(request.getFoundObject());
        }

        log.info("Fonds libérés automatiquement pour {}: {} XAF au finder (commission {} %)",
                request.getReference(), finderPayment, feePct);

        // Notifications (§19)
        notificationRepository.save(Notification.builder()
                .user(finder)
                .type(NotificationType.PAYMENT)
                .title("Restitution réussie 🎉")
                .description("Vous avez reçu " + String.format("%,d", finderPayment) + " XAF. Merci pour votre honnêteté !")
                .read(false)
                .build());

        notificationRepository.save(Notification.builder()
                .user(request.getLoser())
                .type(NotificationType.PAYMENT)
                .title("Restitution réussie 🎉")
                .description(String.format("%s XAF versés au retrouveur.", String.format("%,d", finderPayment)))
                .read(false)
                .build());

        pushReturnNotification(saved, "Restitution réussie 🎉",
                "L'objet a été officiellement restitué. Évaluez votre expérience.", "PAYMENT");

        // Send completion email
        emailService.sendReturnCompletedEmail(saved);
    }

    /** Commission lue depuis le back-office (CDC §8.2 — jamais codée en dur). */
    private int platformFeePercent() {
        try {
            int v = platformSettingsService.getSettingAsInt(SETTING_PLATFORM_FEE);
            if (v < 0 || v > 100) return 15;
            return v;
        } catch (Exception e) {
            return 15;
        }
    }

    // ════════════════════════════════════════════════════════════
    // §22-23 : litiges
    // ════════════════════════════════════════════════════════════

    @Transactional
    public ReturnRequestResponse fileDispute(Long requestId, Long userId, String reason) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        if (request.getStatus() == ReturnStatus.COMPLETED
                || request.getStatus() == ReturnStatus.REFUNDED
                || request.getStatus() == ReturnStatus.RESOLVED
                || request.getStatus() == ReturnStatus.CANCELLED
                || request.getStatus() == ReturnStatus.REJECTED) {
            throw new IllegalArgumentException("Impossible de signaler un litige pour une transaction terminée");
        }

        boolean wasCompleted = request.getStatus() == ReturnStatus.COMPLETED;

        request.setStatus(ReturnStatus.DISPUTED);
        request.setDisputeReason(reason);
        request.setDisputedBy(userId);
        request.setDisputeResolved(false);

        // Geler l'escrow
        if (request.getEscrow() != null) {
            Escrow escrow = request.getEscrow();
            escrow.setStatus(EscrowStatus.DISPUTED);
            escrowRepository.save(escrow);
        }

        ReturnRequest saved = returnRequestRepository.save(request);

        addEvent(saved, userRepository.findById(userId).orElse(null), "DISPUTE_FILED",
                "Litige signalé : " + reason, null);

        // Notify the other party
        boolean isLoser = request.getLoser().getId().equals(userId);
        User other = isLoser ? request.getFinder() : request.getLoser();
        notificationRepository.save(Notification.builder()
                .user(other)
                .type(NotificationType.CLAIM)
                .title("Litige signalé")
                .description("Un litige a été signalé : " + reason)
                .read(false)
                .build());

        pushReturnNotification(saved, "Litige signalé", "Un litige a été signalé : " + reason, "CLAIM");

        emailService.sendDisputeFiledEmail(saved);

        return toResponse(saved, null);
    }

    /**
     * Arbitrage back-office (§23-24) :
     * refundForLoser=true → remboursement Chercheur ;
     * refundForLoser=false → déblocage des fonds au Finder.
     */
    @Transactional
    public ReturnRequestResponse resolveDispute(Long requestId, String resolution, Boolean refundForLoser) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        if (request.getStatus() != ReturnStatus.DISPUTED
                && request.getStatus() != ReturnStatus.UNDER_REVIEW) {
            throw new IllegalArgumentException(
                    "Aucun litige en cours (statut actuel: " + request.getStatus() + ")");
        }

        request.setDisputeResolved(true);
        request.setDisputeResolution(resolution);

        if (refundForLoser != null) {
            Escrow escrow = request.getEscrow();
            if (refundForLoser) {
                // §23 : Chercheur gagne de cause → remboursement
                if (escrow != null && escrow.getStatus() == EscrowStatus.DISPUTED) {
                    escrow.setStatus(EscrowStatus.REFUNDED);
                    escrow.setProgress(0);
                    escrow.setCompletedAt(LocalDateTime.now());
                    escrowRepository.save(escrow);

                    User buyer = request.getLoser();
                    userRepository.creditWalletAtomically(buyer.getId(), escrow.getAmount());

                    transactionRepository.save(Transaction.builder()
                            .user(buyer)
                            .type(TransactionType.REFUND)
                            .amount(escrow.getAmount())
                            .status(TransactionStatus.COMPLETED)
                            .description("Remboursement après litige (" + request.getReference() + ")")
                            .build());
                }
                request.setStatus(ReturnStatus.REFUNDED);
        // §13/§20 : le remboursement termine aussi le partage de position
        locationSharingService.endLocationSharing(request,
                "Remboursement après litige — partage de position désactivé");
            } else {
                // §23 : Finder gagne de cause → déblocage des fonds
                request.setStatus(ReturnStatus.HANDOVER_PENDING);
                if (escrow != null && escrow.getStatus() == EscrowStatus.DISPUTED) {
                    escrow.setStatus(EscrowStatus.RETURN_CONFIRMED);
                    escrowRepository.save(escrow);
                }
                processAutomaticRelease(request);
            }
        } else {
            request.setStatus(ReturnStatus.RESOLVED);
        }

        ReturnRequest saved = returnRequestRepository.save(request);

        addEvent(saved, null, "DISPUTE_RESOLVED",
                "Litige tranché : " + resolution + (refundForLoser != null
                        ? (refundForLoser ? " → remboursement Chercheur" : " → déblocage fonds Finder")
                        : ""), null);

        // Notify both parties
        notificationRepository.save(Notification.builder()
                .user(request.getLoser())
                .type(NotificationType.CLAIM)
                .title("Litige résolu")
                .description("Résolution : " + resolution)
                .read(false)
                .build());
        notificationRepository.save(Notification.builder()
                .user(request.getFinder())
                .type(NotificationType.CLAIM)
                .title("Litige résolu")
                .description("Résolution : " + resolution)
                .read(false)
                .build());

        pushReturnNotification(saved, "Litige résolu", "Résolution : " + resolution, "CLAIM");

        emailService.sendDisputeResolvedEmail(saved);

        return toResponse(saved, null);
    }

    /** Back-office : passe un litige en revue (UNDER_REVIEW, §24). */
    @Transactional
    public ReturnRequestResponse markUnderReview(Long requestId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        if (request.getStatus() != ReturnStatus.DISPUTED) {
            throw new IllegalArgumentException(
                    "Aucun litige à mettre en revue (statut actuel: " + request.getStatus() + ")");
        }

        request.setStatus(ReturnStatus.UNDER_REVIEW);
        ReturnRequest saved = returnRequestRepository.save(request);

        addEvent(saved, null, "UNDER_REVIEW", "Dossier en cours d'arbitrage par le back-office", null);

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // §21 : évaluation
    // ════════════════════════════════════════════════════════════

    @Transactional
    public RatingResponse rateUser(Long requestId, Long raterId, Integer stars, String comment) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        boolean isLoser = request.getLoser().getId().equals(raterId);
        boolean isFinder = request.getFinder().getId().equals(raterId);

        if (!isLoser && !isFinder) {
            throw new IllegalArgumentException("Vous n'êtes pas partie à cette collaboration");
        }

        if (request.getStatus() != ReturnStatus.COMPLETED) {
            throw new IllegalArgumentException(
                    "L'évaluation n'est possible qu'après une restitution confirmée (statut actuel: "
                            + request.getStatus() + ")");
        }

        if (ratingRepository.existsByReturnRequestIdAndRaterId(requestId, raterId)) {
            throw new IllegalArgumentException("Vous avez déjà noté cet échange");
        }

        if (stars < 1 || stars > 5) {
            throw new IllegalArgumentException("La note doit être entre 1 et 5");
        }

        User rated = isLoser ? request.getFinder() : request.getLoser();
        User rater = isLoser ? request.getLoser() : request.getFinder();

        Rating rating = Rating.builder()
                .returnRequest(request)
                .rater(rater)
                .rated(rated)
                .stars(stars)
                .comment(comment)
                .build();

        Rating saved = ratingRepository.save(rating);

        addEvent(request, rater, "RATING_PUBLISHED", stars + " étoile(s) publiée(s)", null);

        // Update trust score
        double avg = ratingRepository.getAverageRating(rated.getId());
        long count = ratingRepository.getRatingCount(rated.getId());
        int newScore = (int) Math.round(avg * 20); // 5 stars = 100
        rated.setTrustScore(Math.min(100, Math.max(0, newScore)));
        userRepository.save(rated);

        return RatingResponse.builder()
                .id(saved.getId())
                .returnRequestId(requestId)
                .rater(toUserResponse(rater))
                .rated(toUserResponse(rated))
                .stars(saved.getStars())
                .comment(saved.getComment())
                .createdAt(saved.getCreatedAt())
                .averageRating(avg)
                .ratingCount(count)
                .build();
    }

    // ════════════════════════════════════════════════════════════
    // §24 : timeline d'audit
    // ════════════════════════════════════════════════════════════

    /** Timeline chronologique d'une collaboration (admin + parties). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTimeline(Long requestId) {
        return eventRepository.findByReturnRequestIdOrderByCreatedAtAsc(requestId).stream()
                .map(e -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id", e.getId());
                    m.put("eventType", e.getEventType());
                    m.put("description", e.getDescription());
                    m.put("actorName", e.getActor() != null ? e.getActor().getName() : "Système");
                    m.put("createdAt", e.getCreatedAt());
                    return m;
                })
                .collect(Collectors.toList());
    }

    private void addEvent(ReturnRequest request, User actor, String type, String description, String metadata) {
        try {
            eventRepository.save(CollaborationEvent.builder()
                    .returnRequest(request)
                    .actor(actor)
                    .eventType(type)
                    .description(description)
                    .metadata(metadata)
                    .build());
        } catch (Exception e) {
            log.error("Impossible d'ajouter l'événement {}: {}", type, e.getMessage());
        }
    }

    // ════════════════════════════════════════════════════════════
    // §24 : vue administrateur — toutes les collaborations

    /** Liste complète des collaborations (back-office §24), filtrable par statut. */
    @Transactional(readOnly = true)
    public List<ReturnRequestResponse> getAllCollaborations(String statusFilter) {
        List<ReturnRequest> all;
        if (statusFilter != null && !statusFilter.isBlank()) {
            try {
                all = returnRequestRepository.findByStatus(ReturnStatus.valueOf(statusFilter.toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Statut inconnu : " + statusFilter);
            }
        } else {
            all = returnRequestRepository.findAll();
        }
        return all.stream().map(r -> toResponse(r, null)).collect(Collectors.toList());
    }

    /**
     * Détail complet d'une collaboration pour l'administration (§24).
     * Regroupe tous les onglets du back-office : Historique (timeline),
     * Paiement (escrow), Messages (conversation liée), Preuves et
     * Localisation (partage §13).
     */
    @Transactional(readOnly = true)
    public CollaborationAdminDetail getCollaborationForAdmin(Long requestId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        // ─── Onglet Paiement : escrow lié ─────────────────────
        CollaborationAdminDetail.EscrowInfo escrowInfo = null;
        if (request.getEscrow() != null) {
            Escrow e = request.getEscrow();
            escrowInfo = CollaborationAdminDetail.EscrowInfo.builder()
                    .id(e.getId())
                    .reference(e.getReference())
                    .amount(e.getAmount())
                    .status(e.getStatus() != null ? e.getStatus().name() : null)
                    .progress(e.getProgress())
                    .location(e.getLocation())
                    .deadline(e.getDeadline() != null ? e.getDeadline().atStartOfDay() : null)
                    .completedAt(e.getCompletedAt())
                    .createdAt(e.getCreatedAt())
                    .build();
        }

        // ─── Onglet Messages : conversation entre les deux parties (§5/§24) ──
        List<CollaborationAdminDetail.ChatMessage> messages = List.of();
        Optional<Conversation> conversationOpt =
                conversationRepository.findByUsers(request.getLoser(), request.getFinder());
        if (conversationOpt.isPresent()) {
            messages = messageRepository
                    .findByConversationIdOrderByCreatedAtAsc(conversationOpt.get().getId())
                    .stream()
                    .map(m -> CollaborationAdminDetail.ChatMessage.builder()
                            .id(m.getId())
                            .senderId(m.getSender().getId())
                            .senderName(m.getSender().getName())
                            .content(m.getDeleted() ? "(message supprimé)" : m.getContent())
                            .imageUrl(m.getDeleted() ? null : m.getImageUrl())
                            .deleted(m.getDeleted())
                            .createdAt(m.getCreatedAt())
                            .build())
                    .collect(Collectors.toList());
        }

        // ─── Onglet Preuves : preuves de propriété ────────────
        List<CollaborationAdminDetail.ProofInfo> proofs = proofRepository
                .findByReturnRequestIdOrderByCreatedAtDesc(requestId)
                .stream()
                .map(p -> CollaborationAdminDetail.ProofInfo.builder()
                        .id(p.getId())
                        .submittedByName(p.getSubmittedBy().getName())
                        .description(p.getDescription())
                        .characteristics(p.getCharacteristics())
                        .condition(p.getCondition())
                        .discoveryLocation(p.getDiscoveryLocation())
                        .serialNumber(p.getSerialNumber())
                        .status(p.getStatus() != null ? p.getStatus().name() : null)
                        .reviewNote(p.getReviewNote())
                        .photos(p.getPhotos())
                        .createdAt(p.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        // ─── Onglet Localisation : positions partagées (§13) ──
        List<CollaborationAdminDetail.LiveLocation> locations = locationRepository
                .findByReturnRequestId(requestId)
                .stream()
                .map(loc -> CollaborationAdminDetail.LiveLocation.builder()
                        .userId(loc.getUser().getId())
                        .userName(loc.getUser().getName())
                        .latitude(loc.getLatitude())
                        .longitude(loc.getLongitude())
                        .accuracyMeters(loc.getAccuracyMeters())
                        .updatedAt(loc.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());

        // ─── Onglet Historique : timeline d'audit ─────────────
        List<CollaborationAdminDetail.TimelineEntry> timeline =
                eventRepository.findByReturnRequestIdOrderByCreatedAtAsc(requestId)
                        .stream()
                        .map(e -> CollaborationAdminDetail.TimelineEntry.builder()
                                .id(e.getId())
                                .eventType(e.getEventType())
                                .description(e.getDescription())
                                .actorName(e.getActor() != null ? e.getActor().getName() : "Système")
                                .createdAt(e.getCreatedAt())
                                .build())
                        .collect(Collectors.toList());

        return CollaborationAdminDetail.builder()
                .collaboration(toResponse(request, null))
                .timeline(timeline)
                .escrow(escrowInfo)
                .messages(messages)
                .proofs(proofs)
                .locations(locations)
                .build();
    }

    // Admin Queries
    // ════════════════════════════════════════════════════════════

    public List<ReturnRequestResponse> getAllDisputes() {
        return returnRequestRepository.findByStatus(ReturnStatus.DISPUTED).stream()
                .map(r -> toResponse(r, null))
                .collect(Collectors.toList());
    }

    public Map<String, Object> getDisputeStats() {
        long disputed = returnRequestRepository.findByStatus(ReturnStatus.DISPUTED).size();
        long resolved = returnRequestRepository.findByStatus(ReturnStatus.RESOLVED).size()
                + returnRequestRepository.findByStatus(ReturnStatus.REFUNDED).size()
                + returnRequestRepository.findByStatus(ReturnStatus.COMPLETED).size();
        long total = disputed + resolved;
        List<ReturnRequest> allReturns = returnRequestRepository.findAll();
        long completed = allReturns.stream().filter(r -> r.getStatus() == ReturnStatus.COMPLETED).count();
        long totalVolume = allReturns.stream()
                .filter(r -> r.getAcceptedAmount() != null)
                .mapToLong(ReturnRequest::getAcceptedAmount)
                .sum();
        long totalPlatformFees = allReturns.stream()
                .filter(r -> r.getPlatformFee() != null)
                .mapToLong(ReturnRequest::getPlatformFee)
                .sum();

        return Map.of(
                "totalDisputes", disputed,
                "resolvedDisputes", resolved,
                "disputeRate", total > 0 ? Math.round((double) disputed / total * 100) : 0,
                "totalReturns", total,
                "completedReturns", completed,
                "totalVolume", totalVolume,
                "totalPlatformFees", totalPlatformFees
        );
    }

    // ════════════════════════════════════════════════════════════
    // Queries
    // ════════════════════════════════════════════════════════════

    /** Notes reçues par un utilisateur (profil, §21). */
    public List<RatingResponse> getRatingsForUser(Long userId) {
        return ratingRepository.findByRatedIdOrderByCreatedAtDesc(userId).stream()
                .map(r -> RatingResponse.builder()
                        .id(r.getId())
                        .returnRequestId(r.getReturnRequest().getId())
                        .rater(toUserResponse(r.getRater()))
                        .rated(toUserResponse(r.getRated()))
                        .stars(r.getStars())
                        .comment(r.getComment())
                        .createdAt(r.getCreatedAt())
                        .averageRating(ratingRepository.getAverageRating(userId))
                        .ratingCount(ratingRepository.getRatingCount(userId))
                        .build())
                .collect(Collectors.toList());
    }

    public List<ReturnRequestResponse> getMyReturns(Long userId) {
        return returnRequestRepository.findByLoserIdOrFinderIdOrderByCreatedAtDesc(userId, userId).stream()
                .map(r -> {
                    boolean hasRating = ratingRepository.existsByReturnRequestIdAndRaterId(r.getId(), userId);
                    return toResponse(r, hasRating);
                })
                .collect(Collectors.toList());
    }

    public ReturnRequestResponse getById(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        boolean hasRating = ratingRepository.existsByReturnRequestIdAndRaterId(requestId, userId);
        return toResponse(request, hasRating);
    }

    // ════════════════════════════════════════════════════════════
    // WebSocket push notifications
    // ════════════════════════════════════════════════════════════

    private void pushReturnNotification(ReturnRequest request, String title, String description, String type) {
        try {
            NotificationWsMessage message = NotificationWsMessage.builder()
                    .type(type)
                    .title(title)
                    .description(description)
                    .timestamp(System.currentTimeMillis())
                    .build();

            wsNotificationController.sendNotificationToUser(request.getLoser().getId(), message);
            wsNotificationController.sendNotificationToUser(request.getFinder().getId(), message);
        } catch (Exception e) {
            log.error("Failed to push WebSocket notification: {}", e.getMessage());
        }
    }

    private void pushReturnNotificationToUser(Long userId, ReturnRequest request, String title, String description, String type) {
        try {
            NotificationWsMessage message = NotificationWsMessage.builder()
                    .type(type)
                    .title(title)
                    .description(description)
                    .timestamp(System.currentTimeMillis())
                    .build();

            wsNotificationController.sendNotificationToUser(userId, message);
        } catch (Exception e) {
            log.error("Failed to push WebSocket notification: {}", e.getMessage());
        }
    }

    // ════════════════════════════════════════════════════════════
    // Mappers
    // ════════════════════════════════════════════════════════════

    private ReturnRequestResponse toResponse(ReturnRequest r, Boolean hasRating) {
        return ReturnRequestResponse.builder()
                .id(r.getId())
                .reference(r.getReference())
                .lostObjectId(r.getLostObject() != null ? r.getLostObject().getId() : null)
                .lostObjectTitle(r.getLostObject() != null ? r.getLostObject().getTitle() : null)
                .foundObjectId(r.getFoundObject() != null ? r.getFoundObject().getId() : null)
                .foundObjectTitle(r.getFoundObject() != null ? r.getFoundObject().getTitle() : null)
                .loser(toUserResponse(r.getLoser()))
                .finder(toUserResponse(r.getFinder()))
                .proposedAmount(r.getProposedAmount())
                .acceptedAmount(r.getAcceptedAmount())
                .platformFeePct(r.getPlatformFeePct())
                .status(r.getStatus().name())
                .verificationAttempts(r.getVerificationAttempts())
                .loserValidated(r.getLoserValidated())
                .finderValidated(r.getFinderValidated())
                .loserReturnConfirmed(r.getLoserReturnConfirmed())
                .finderReturnConfirmed(r.getFinderReturnConfirmed())
                .meetingDate(r.getMeetingDate())
                .meetingLocation(r.getMeetingLocation())
                .meetingLat(r.getMeetingLat())
                .meetingLng(r.getMeetingLng())
                .disputeReason(r.getDisputeReason())
                .disputeResolved(r.getDisputeResolved())
                .paymentAmount(r.getPaymentAmount())
                .platformFee(r.getPlatformFee())
                .completedAt(r.getCompletedAt())
                .createdAt(r.getCreatedAt())
                .hasRating(hasRating)
                .build();
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .avatar(user.getAvatar())
                .trustScore(user.getTrustScore())
                .verified(user.getVerified())
                .build();
    }
}
