package com.retrouvit.service;

import com.retrouvit.controller.WebSocketNotificationController;
import com.retrouvit.dto.NotificationWsMessage;
import com.retrouvit.dto.RatingResponse;
import com.retrouvit.dto.ReturnRequestResponse;
import com.retrouvit.dto.UserResponse;
import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.*;
import com.retrouvit.entity.Escrow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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

    // ════════════════════════════════════════════════════════════
    // Phase 1: Initiate return (finder creates match)
    // ════════════════════════════════════════════════════════════

    @Transactional
    public ReturnRequestResponse initiateReturn(Long finderId, Long loserId, Long lostObjectId, Long foundObjectId) {
        // Check if already exists (only if lostObjectId is provided)
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

        // Notify the loser
        notificationRepository.save(Notification.builder()
                .user(loser)
                .type(NotificationType.MATCH)
                .title("Objet trouvé !")
                .description(finder.getName() + " a trouvé votre objet : " + (lostObject != null ? lostObject.getTitle() : "objet") + ". Soumettez des preuves pour prouver la correspondance.")
                .read(false)
                .build());

        // WebSocket push
        pushReturnNotification(saved, "Restitution initiée", finder.getName() + " souhaite restituer un objet trouvé.", "MATCH");

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // Backward-compatible reward flow (used by messages page)
    // ════════════════════════════════════════════════════════════

    @Transactional
    public ReturnRequestResponse proposeReward(Long requestId, Long userId, Long amount) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        if (!request.getLoser().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le propriétaire peut proposer la récompense");
        }

        request.setProposedAmount(amount);
        request.setStatus(ReturnStatus.NEGOTIATING);
        ReturnRequest saved = returnRequestRepository.save(request);

        // Notify finder
        notificationRepository.save(Notification.builder()
                .user(request.getFinder())
                .type(NotificationType.PAYMENT)
                .title("Récompense proposée")
                .description("Le propriétaire propose " + String.format("%,d", amount) + " XAF comme récompense.")
                .read(false)
                .build());

        pushReturnNotification(saved, "Récompense proposée", String.format("%,d", amount) + " XAF proposés.", "PAYMENT");

        return toResponse(saved, null);
    }

    @Transactional
    public ReturnRequestResponse acceptReward(Long requestId, Long userId, Long acceptedAmount) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        if (!request.getFinder().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le retrouveur peut accepter la récompense");
        }

        // ─── Validate BEFORE any mutation ──────────────────────────
        User buyer = request.getLoser();
        if (buyer.getWalletBalance() < acceptedAmount) {
            throw new IllegalArgumentException("Solde insuffisant (" + String.format("%,d", buyer.getWalletBalance()) + " XAF). Veuillez recharger votre portefeuille.");
        }

        // Deduct from buyer wallet
        buyer.setWalletBalance(buyer.getWalletBalance() - acceptedAmount);
        userRepository.save(buyer);

        // Now safely update the return request
        request.setAcceptedAmount(acceptedAmount);
        request.setStatus(ReturnStatus.PAYMENT_LOCKED);

        // Create and save escrow first (must be persisted before setting on ReturnRequest)
        com.retrouvit.entity.Escrow escrow = com.retrouvit.entity.Escrow.builder()
                .reference("ESC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .buyer(request.getLoser())
                .seller(request.getFinder())
                .amount(acceptedAmount)
                .lostObject(request.getLostObject())
                .foundObject(request.getFoundObject())
                .deadline(java.time.LocalDate.now().plusDays(7))
                .status(EscrowStatus.AWAITING_RETURN)
                .location(request.getMeetingLocation())
                .build();
        Escrow savedEscrow = escrowRepository.save(escrow);

        request.setEscrow(savedEscrow);
        ReturnRequest saved = returnRequestRepository.save(request);

        // Notify loser
        notificationRepository.save(Notification.builder()
                .user(request.getLoser())
                .type(NotificationType.PAYMENT)
                .title("Récompense acceptée")
                .description(acceptedAmount + " XAF ont été mis en séquestre. Vous pouvez valider la collaboration.")
                .read(false)
                .build());

        pushReturnNotification(saved, "Récompense acceptée", String.format("%,d", acceptedAmount) + " XAF en séquestre.", "PAYMENT");

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // Phase 4: Paiement — Le owner paie le montant accepté
    // ════════════════════════════════════════════════════════════

    @Transactional
    public ReturnRequestResponse payReward(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        if (!request.getLoser().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le propriétaire peut effectuer le paiement");
        }

        if (request.getStatus() != ReturnStatus.REWARD_ACCEPTED) {
            throw new IllegalArgumentException(
                    "Le paiement n'est possible qu'après acceptation de la récompense (statut actuel: " + request.getStatus() + ")");
        }

        Long amount = request.getAcceptedAmount();
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Montant de récompense invalide");
        }

        // Vérifier le solde du propriétaire
        User buyer = request.getLoser();
        if (buyer.getWalletBalance() < amount) {
            throw new IllegalArgumentException(
                    "Solde insuffisant (" + String.format("%,d", buyer.getWalletBalance()) + " XAF). "
                    + "Rechargez votre portefeuille.");
        }

        // Débiter le wallet du propriétaire
        buyer.setWalletBalance(buyer.getWalletBalance() - amount);
        userRepository.save(buyer);

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

        // Mettre à jour le statut
        request.setEscrow(savedEscrow);
        request.setStatus(ReturnStatus.PAYMENT_LOCKED);
        ReturnRequest saved = returnRequestRepository.save(request);

        // Transaction record
        transactionRepository.save(Transaction.builder()
                .user(buyer)
                .type(TransactionType.DEPOSIT)
                .amount(amount)
                .status(TransactionStatus.COMPLETED)
                .description("Paiement récompense pour retour d'objet (" + saved.getReference() + ")")
                .build());

        // Notifier les deux parties
        String formattedAmount = String.format("%,d", amount);
        notificationRepository.save(Notification.builder()
                .user(request.getFinder())
                .type(NotificationType.PAYMENT)
                .title("Paiement sécurisé !")
                .description(formattedAmount + " XAF ont été mis en séquestre. Vous pouvez maintenant collaborer.")
                .read(false)
                .build());

        pushReturnNotification(saved, "Paiement sécurisé !",
                formattedAmount + " XAF en séquestre. Collaboration ouverte.", "PAYMENT");

        log.info("Payment locked for return request {}: {} XAF (escrow {})", requestId, amount, savedEscrow.getReference());
        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // Phase 5: Activer la collaboration (après PAYMENT_LOCKED)
    // ════════════════════════════════════════════════════════════

    @Transactional
    public ReturnRequestResponse activateCollaboration(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        boolean isLoser = request.getLoser().getId().equals(userId);
        boolean isFinder = request.getFinder().getId().equals(userId);
        if (!isLoser && !isFinder) {
            throw new IllegalArgumentException("Vous n'êtes pas partie à cette collaboration");
        }

        if (request.getStatus() != ReturnStatus.PAYMENT_LOCKED) {
            throw new IllegalArgumentException(
                    "La collaboration ne peut être activée qu'après verrouillage du paiement (statut actuel: " + request.getStatus() + ")");
        }

        request.setStatus(ReturnStatus.COLLABORATION_ACTIVE);
        request.setCollaborationStartedAt(LocalDateTime.now());

        // Mettre à jour l'escrow
        if (request.getEscrow() != null) {
            Escrow escrow = request.getEscrow();
            escrow.setStatus(EscrowStatus.LOCKED);
            escrow.setProgress(20);
            escrowRepository.save(escrow);
        }

        ReturnRequest saved = returnRequestRepository.save(request);

        // Notifier les deux parties
        notificationRepository.save(Notification.builder()
                .user(request.getLoser())
                .type(NotificationType.MATCH)
                .title("Collaboration active !")
                .description("Vous pouvez maintenant organiser la restitution avec " + request.getFinder().getName())
                .read(false)
                .build());

        notificationRepository.save(Notification.builder()
                .user(request.getFinder())
                .type(NotificationType.MATCH)
                .title("Collaboration active !")
                .description("La collaboration est ouverte. Organisez la restitution avec " + request.getLoser().getName())
                .read(false)
                .build());

        pushReturnNotification(saved, "Collaboration active !",
                "Messagerie ouverte. Organisez la restitution.", "MATCH");

        log.info("Collaboration activated for return request {}", requestId);
        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // Phase 6: Validation collaboration (both parties)
    // ════════════════════════════════════════════════════════════

    @Transactional
    public ReturnRequestResponse validateCollaboration(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        boolean isLoser = request.getLoser().getId().equals(userId);
        boolean isFinder = request.getFinder().getId().equals(userId);

        if (!isLoser && !isFinder) {
            throw new IllegalArgumentException("Vous n'êtes pas partie à cette collaboration");
        }

        if (request.getStatus() != ReturnStatus.COLLABORATION_ACTIVE) {
            throw new IllegalArgumentException(
                    "La validation n'est possible qu'en collaboration active (statut actuel: " + request.getStatus() + ")");
        }

        if (isLoser) request.setLoserValidated(true);
        if (isFinder) request.setFinderValidated(true);

        ReturnRequest saved = returnRequestRepository.save(request);

        // Notify the other party
        User other = isLoser ? request.getFinder() : request.getLoser();
        String who = isLoser ? "Le propriétaire" : "Le retrouveur";
        notificationRepository.save(Notification.builder()
                .user(other)
                .type(NotificationType.MATCH)
                .title("Collaboration validée")
                .description(who + " a validé la collaboration. Fixez un rendez-vous maintenant !")
                .read(false)
                .build());

        if (request.isFullyValidated()) {
            pushReturnNotification(saved, "Collaboration validée", who + " a validé. Fixez un rendez-vous !", "MATCH");
        } else {
            pushReturnNotificationToUser(other.getId(), saved, "Validation reçue", who + " a validé sa partie.", "MATCH");
        }

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // Appointment
    // ════════════════════════════════════════════════════════════

    @Transactional
    public ReturnRequestResponse setAppointment(Long requestId, Long userId, LocalDateTime meetingDate, String location, Double lat, Double lng) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        if (request.getStatus() != ReturnStatus.COLLABORATION_ACTIVE) {
            throw new IllegalArgumentException(
                    "Le rendez-vous ne peut être fixé qu'en collaboration active (statut actuel: " + request.getStatus() + ")");
        }

        request.setMeetingDate(meetingDate);
        request.setMeetingLocation(location);
        request.setMeetingLat(lat);
        request.setMeetingLng(lng);

        ReturnRequest saved = returnRequestRepository.save(request);

        // Notify both parties
        User other = request.getLoser().getId().equals(userId) ? request.getFinder() : request.getLoser();
        notificationRepository.save(Notification.builder()
                .user(other)
                .type(NotificationType.MATCH)
                .title("Rendez-vous fixé")
                .description("Rendez-vous le " + meetingDate + " à " + location)
                .read(false)
                .build());

        // WebSocket push
        pushReturnNotification(saved, "Rendez-vous fixé", "Le " + meetingDate + " à " + location, "MATCH");

        return toResponse(saved, null);
    }

    @Transactional
    public ReturnRequestResponse startReturn(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        if (request.getStatus() != ReturnStatus.COLLABORATION_ACTIVE) {
            throw new IllegalArgumentException(
                    "La restitution ne peut démarrer qu'en collaboration active (statut actuel: " + request.getStatus() + ")");
        }

        request.setStatus(ReturnStatus.RETURN_IN_PROGRESS);
        ReturnRequest saved = returnRequestRepository.save(request);

        // WebSocket push
        boolean isFinder = request.getFinder().getId().equals(userId);
        User other = isFinder ? request.getLoser() : request.getFinder();
        String who = isFinder ? "Le retrouveur" : "Le propriétaire";
        pushReturnNotificationToUser(other.getId(), saved, "Restitution en cours", who + " est en route pour la restitution.", "MATCH");

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // Phase 7: Return confirmation (both parties)
    // ════════════════════════════════════════════════════════════

    @Transactional
    public ReturnRequestResponse confirmReturn(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        boolean isLoser = request.getLoser().getId().equals(userId);
        boolean isFinder = request.getFinder().getId().equals(userId);

        if (!isLoser && !isFinder) {
            throw new IllegalArgumentException("Vous n'êtes pas partie à cette restitution");
        }

        if (request.getStatus() != ReturnStatus.RETURN_IN_PROGRESS
                && request.getStatus() != ReturnStatus.RETURN_CONFIRMED) {
            throw new IllegalArgumentException(
                    "La confirmation de retour n'est pas possible en statut " + request.getStatus());
        }

        if (isLoser) request.setLoserReturnConfirmed(true);
        if (isFinder) request.setFinderReturnConfirmed(true);

        if (request.isFullyReturned()) {
            request.setStatus(ReturnStatus.RETURN_CONFIRMED);

            // Mettre à jour l'escrow
            if (request.getEscrow() != null) {
                Escrow escrow = request.getEscrow();
                escrow.setStatus(EscrowStatus.RETURN_CONFIRMED);
                escrow.setProgress(80);
                escrowRepository.save(escrow);
            }
        }

        ReturnRequest saved = returnRequestRepository.save(request);

        User other = isLoser ? request.getFinder() : request.getLoser();
        String who = isLoser ? "Le propriétaire" : "Le retrouveur";
        notificationRepository.save(Notification.builder()
                .user(other)
                .type(NotificationType.MATCH)
                .title("Retour confirmé")
                .description(who + " a confirmé la restitution de l'objet.")
                .read(false)
                .build());

        if (request.isFullyReturned()) {
            pushReturnNotification(saved, "Retour confirmé !", "L'objet a été restitué. Le paiement va être libéré.", "PAYMENT");
        } else {
            pushReturnNotificationToUser(other.getId(), saved, "Retour confirmé", who + " a confirmé la restitution.", "MATCH");
        }

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // Phase 8: Release payment (after return confirmed)
    // ════════════════════════════════════════════════════════════

    @Transactional
    public ReturnRequestResponse releasePayment(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        boolean isLoser = request.getLoser().getId().equals(userId);
        boolean isFinder = request.getFinder().getId().equals(userId);
        if (!isLoser && !isFinder) {
            throw new IllegalArgumentException("Vous n'êtes pas partie à cette transaction");
        }

        if (request.getStatus() != ReturnStatus.RETURN_CONFIRMED) {
            throw new IllegalArgumentException(
                    "Le paiement ne peut être libéré qu'après confirmation du retour (statut actuel: " + request.getStatus() + ")");
        }

        // Protection contre double release
        if (request.getEscrow() != null) {
            Escrow escrow = request.getEscrow();
            if (escrow.getStatus() == EscrowStatus.RELEASED || escrow.getStatus() == EscrowStatus.COMPLETED) {
                throw new IllegalStateException("Ce paiement a déjà été libéré");
            }
        }

        // Libérer le paiement
        processPayment(request);

        ReturnRequest saved = returnRequestRepository.save(request);

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // Payment processing (15% platform fee)
    // ════════════════════════════════════════════════════════════

    private void processPayment(ReturnRequest request) {
        Long acceptedAmount = request.getAcceptedAmount();
        if (acceptedAmount == null) return;

        long platformFee = acceptedAmount * request.getPlatformFeePct() / 100;
        long finderPayment = acceptedAmount - platformFee;

        request.setPlatformFee(platformFee);
        request.setPaymentAmount(finderPayment);

        // Credit finder's wallet
        User finder = request.getFinder();
        finder.setWalletBalance(finder.getWalletBalance() + finderPayment);
        userRepository.save(finder);

        // Record transaction
        transactionRepository.save(Transaction.builder()
                .user(finder)
                .type(TransactionType.REWARD)
                .amount(finderPayment)
                .status(TransactionStatus.COMPLETED)
                .description("Récompense pour retour de " + (request.getLostObject() != null ? request.getLostObject().getTitle() : "objet")
                        + " (-" + platformFee + " XAF de frais de plateforme)")
                .build());

        // Mettre à jour l'escrow
        if (request.getEscrow() != null) {
            Escrow escrow = request.getEscrow();
            escrow.setStatus(EscrowStatus.RELEASED);
            escrow.setProgress(100);
            escrow.setCompletedAt(LocalDateTime.now());
            escrowRepository.save(escrow);
        }

        request.setStatus(ReturnStatus.RELEASED);
        request.setReleasedAt(LocalDateTime.now());
        request.setCompletedAt(LocalDateTime.now());

        // Update lost object status to RETURNED
        if (request.getLostObject() != null) {
            request.getLostObject().setStatus(ObjectStatus.RETURNED);
            lostObjectRepository.save(request.getLostObject());
        }
        // Update found object status to RETURNED
        if (request.getFoundObject() != null) {
            request.getFoundObject().setStatus(ObjectStatus.RETURNED);
            foundObjectRepository.save(request.getFoundObject());
        }

        log.info("Payment released: {} XAF to finder ({} XAF platform fee)",
                finderPayment, platformFee);

        // Notify
        notificationRepository.save(Notification.builder()
                .user(finder)
                .type(NotificationType.PAYMENT)
                .title("Paiement reçu !")
                .description("Vous avez reçu " + String.format("%,d", finderPayment) + " XAF. Merci pour votre honnêteté !")
                .read(false)
                .build());

        notificationRepository.save(Notification.builder()
                .user(request.getLoser())
                .type(NotificationType.PAYMENT)
                .title("Paiement effectué")
                .description(String.format("%,d", finderPayment) + " XAF versés au retrouveur.")
                .read(false)
                .build());

        pushReturnNotification(request, "Paiement libéré !",
                String.format("%,d", finderPayment) + " XAF versés au retrouveur.", "PAYMENT");

        // Send completion email
        emailService.sendReturnCompletedEmail(request);
    }

    // ════════════════════════════════════════════════════════════
    // Dispute
    // ════════════════════════════════════════════════════════════

    @Transactional
    public ReturnRequestResponse fileDispute(Long requestId, Long userId, String reason) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        // Vérifier que la demande est dans un état permettant un litige
        if (request.getStatus() == ReturnStatus.COMPLETED
                || request.getStatus() == ReturnStatus.RELEASED
                || request.getStatus() == ReturnStatus.REFUNDED
                || request.getStatus() == ReturnStatus.CANCELLED) {
            throw new IllegalArgumentException("Impossible de signaler un litige pour une transaction terminée");
        }

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

        // WebSocket push
        pushReturnNotification(saved, "Litige signalé", "Un litige a été signalé : " + reason, "CLAIM");

        // Send dispute email
        emailService.sendDisputeFiledEmail(saved);

        return toResponse(saved, null);
    }

    @Transactional
    public ReturnRequestResponse resolveDispute(Long requestId, String resolution) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        request.setDisputeResolved(true);
        request.setDisputeResolution(resolution);
        request.setStatus(ReturnStatus.DISPUTE_RESOLVED);

        ReturnRequest saved = returnRequestRepository.save(request);

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

        // WebSocket push
        pushReturnNotification(saved, "Litige résolu", "Résolution : " + resolution, "CLAIM");

        // Send resolution email
        emailService.sendDisputeResolvedEmail(saved);

        return toResponse(saved, null);
    }

    // ════════════════════════════════════════════════════════════
    // Rating & Comments
    // ════════════════════════════════════════════════════════════

    @Transactional
    public RatingResponse rateUser(Long requestId, Long raterId, Integer stars, String comment) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        boolean isLoser = request.getLoser().getId().equals(raterId);
        boolean isFinder = request.getFinder().getId().equals(raterId);

        if (!isLoser && !isFinder) {
            throw new IllegalArgumentException("Vous n'êtes pas partie à cette collaboration");
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

    // ════════════════════════════════════════════════════════════
    // Admin Queries
    // ════════════════════════════════════════════════════════════

    public List<ReturnRequestResponse> getAllDisputes() {
        return returnRequestRepository.findByStatus(ReturnStatus.DISPUTED).stream()
                .map(r -> toResponse(r, null))
                .collect(Collectors.toList());
    }

    public Map<String, Object> getDisputeStats() {
        long disputed = returnRequestRepository.findByStatus(ReturnStatus.DISPUTED).size();
        long resolved = returnRequestRepository.findByStatus(ReturnStatus.DISPUTE_RESOLVED).size();
        long total = disputed + resolved;
        List<ReturnRequest> allReturns = returnRequestRepository.findAll();
        long completed = allReturns.stream().filter(r -> r.getStatus() == ReturnStatus.RELEASED).count();
        long totalVolume = allReturns.stream()
                .filter(r -> r.getAcceptedAmount() != null)
                .mapToLong(ReturnRequest::getAcceptedAmount)
                .sum();
        long disputeFees = allReturns.stream()
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
                "totalPlatformFees", disputeFees
        );
    }

    // ════════════════════════════════════════════════════════════
    // Queries
    // ════════════════════════════════════════════════════════════

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
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

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
