package com.retrouvit.service;

import com.retrouvit.controller.WebSocketNotificationController;
import com.retrouvit.dto.NotificationWsMessage;
import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.NegotiationOfferRepository;
import com.retrouvit.repository.NotificationRepository;
import com.retrouvit.repository.ReturnRequestRepository;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NegotiationService {

    private final NegotiationOfferRepository negotiationOfferRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final WebSocketNotificationController wsNotificationController;

    // ════════════════════════════════════════════════════════════
    // Proposer un montant
    // ════════════════════════════════════════════════════════════

    @Transactional
    public NegotiationOffer propose(Long returnRequestId, Long userId, Long amount, String message) {
        ReturnRequest request = returnRequestRepository.findById(returnRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        User proposer = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        // Seul le owner ou le finder peut proposer
        boolean isOwner = request.getLoser().getId().equals(userId);
        boolean isFinder = request.getFinder().getId().equals(userId);
        if (!isOwner && !isFinder) {
            throw new IllegalArgumentException("Vous n'êtes pas partie à cette négociation");
        }

        // Vérifier le statut — proposition possible dès la conversation active
        // (mapping §25 : l'ancien OWNER_CONFIRMED/NEGOTIATING devient CHAT_ACTIVE/PROPOSAL_PENDING)
        if (request.getStatus() != ReturnStatus.CHAT_ACTIVE
                && request.getStatus() != ReturnStatus.PROPOSAL_PENDING) {
            throw new IllegalArgumentException(
                    "Impossible de proposer un montant pour une demande en statut " + request.getStatus());
        }

        // Valider le montant
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Le montant doit être supérieur à 0");
        }

        // Seul le finder peut faire la première proposition (§6 — mapping de l'ancienne règle owner-first)
        if (request.getStatus() == ReturnStatus.CHAT_ACTIVE && !isFinder) {
            throw new IllegalArgumentException(
                    "Le Finder fait la première proposition de récompense");
        }

        NegotiationOffer offer = NegotiationOffer.builder()
                .returnRequest(request)
                .offeredBy(proposer)
                .amount(amount)
                .status(NegotiationStatus.PROPOSED)
                .message(message)
                .build();

        NegotiationOffer saved = negotiationOfferRepository.save(offer);

        // Mettre à jour le statut de la demande (§25 : PROPOSAL_PENDING)
        request.setStatus(ReturnStatus.PROPOSAL_PENDING);
        request.setProposedAmount(amount);
        returnRequestRepository.save(request);

        // Notifier l'autre partie
        User other = isOwner ? request.getFinder() : request.getLoser();
        notificationRepository.save(Notification.builder()
                .user(other)
                .type(NotificationType.PAYMENT)
                .title("Proposition de récompense")
                .description(proposer.getName() + " propose " + String.format("%,d", amount) + " XAF")
                .read(false)
                .build());

        pushNotification(other.getId(),
                "Proposition de récompense",
                String.format("%,d", amount) + " XAF proposés par " + proposer.getName(),
                "PAYMENT");

        log.info("Negotiation offer made for return request {} by user {}: {} XAF",
                returnRequestId, userId, amount);
        return saved;
    }

    // ════════════════════════════════════════════════════════════
    // Contre-proposer
    // ════════════════════════════════════════════════════════════

    @Transactional
    public NegotiationOffer counterPropose(Long returnRequestId, Long userId, Long amount, String message) {
        ReturnRequest request = returnRequestRepository.findById(returnRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        User proposer = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        boolean isOwner = request.getLoser().getId().equals(userId);
        boolean isFinder = request.getFinder().getId().equals(userId);
        if (!isOwner && !isFinder) {
            throw new IllegalArgumentException("Vous n'êtes pas partie à cette négociation");
        }

        // Doit être en proposition en attente
        if (request.getStatus() != ReturnStatus.PROPOSAL_PENDING) {
            throw new IllegalArgumentException(
                    "Impossible de contre-proposer pour une demande en statut " + request.getStatus());
        }

        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Le montant doit être supérieur à 0");
        }

        // Marquer la dernière offre comme COUNTERED
        List<NegotiationOffer> existingOffers = negotiationOfferRepository
                .findByReturnRequestIdOrderByCreatedAtAsc(returnRequestId);
        if (!existingOffers.isEmpty()) {
            NegotiationOffer lastOffer = existingOffers.get(existingOffers.size() - 1);
            lastOffer.setStatus(NegotiationStatus.COUNTERED);
            negotiationOfferRepository.save(lastOffer);
        }

        // Créer la contre-proposition
        NegotiationOffer offer = NegotiationOffer.builder()
                .returnRequest(request)
                .offeredBy(proposer)
                .amount(amount)
                .status(NegotiationStatus.PROPOSED)
                .parentOffer(existingOffers.isEmpty() ? null : existingOffers.get(existingOffers.size() - 1))
                .message(message)
                .build();

        NegotiationOffer saved = negotiationOfferRepository.save(offer);

        // Mettre à jour le montant proposé
        request.setProposedAmount(amount);
        returnRequestRepository.save(request);

        // Notifier l'autre partie
        User other = isOwner ? request.getFinder() : request.getLoser();
        notificationRepository.save(Notification.builder()
                .user(other)
                .type(NotificationType.PAYMENT)
                .title("Contre-proposition")
                .description(proposer.getName() + " propose " + String.format("%,d", amount) + " XAF")
                .read(false)
                .build());

        pushNotification(other.getId(),
                "Contre-proposition",
                String.format("%,d", amount) + " XAF proposés par " + proposer.getName(),
                "PAYMENT");

        log.info("Counter-proposal for return request {} by user {}: {} XAF",
                returnRequestId, userId, amount);
        return saved;
    }

    // ════════════════════════════════════════════════════════════
    // Accepter l'offre
    // ════════════════════════════════════════════════════════════

    @Transactional
    public ReturnRequest acceptOffer(Long returnRequestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(returnRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        User acceptor = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        boolean isOwner = request.getLoser().getId().equals(userId);
        boolean isFinder = request.getFinder().getId().equals(userId);
        if (!isOwner && !isFinder) {
            throw new IllegalArgumentException("Vous n'êtes pas partie à cette négociation");
        }

        if (request.getStatus() != ReturnStatus.PROPOSAL_PENDING) {
            throw new IllegalArgumentException(
                    "Impossible d'accepter pour une demande en statut " + request.getStatus());
        }

        if (request.getProposedAmount() == null || request.getProposedAmount() <= 0) {
            throw new IllegalArgumentException("Aucun montant à accepter");
        }

        // Marquer la dernière offre comme ACCEPTED
        List<NegotiationOffer> offers = negotiationOfferRepository
                .findByReturnRequestIdOrderByCreatedAtAsc(returnRequestId);
        if (!offers.isEmpty()) {
            NegotiationOffer lastOffer = offers.get(offers.size() - 1);
            lastOffer.setStatus(NegotiationStatus.ACCEPTED);
            negotiationOfferRepository.save(lastOffer);
        }

        // Enregistrer le montant accepté (§7 : accepter → PAYMENT_PENDING)
        request.setAcceptedAmount(request.getProposedAmount());
        request.setStatus(ReturnStatus.PAYMENT_PENDING);
        ReturnRequest saved = returnRequestRepository.save(request);

        // Notifier l'autre partie
        User other = isOwner ? request.getFinder() : request.getLoser();
        String formattedAmount = String.format("%,d", request.getAcceptedAmount());
        notificationRepository.save(Notification.builder()
                .user(other)
                .type(NotificationType.PAYMENT)
                .title("Récompense acceptée !")
                .description(formattedAmount + " XAF acceptés. Le propriétaire doit maintenant payer.")
                .read(false)
                .build());

        pushNotification(other.getId(),
                "Récompense acceptée !",
                formattedAmount + " XAF acceptés. Paiement en attente.",
                "PAYMENT");

        log.info("Negotiation accepted for return request {} by user {}: {} XAF",
                returnRequestId, userId, request.getAcceptedAmount());
        return saved;
    }

    // ════════════════════════════════════════════════════════════
    // Refuser l'offre
    // ════════════════════════════════════════════════════════════

    @Transactional
    public ReturnRequest rejectOffer(Long returnRequestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(returnRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        User rejector = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        boolean isOwner = request.getLoser().getId().equals(userId);
        boolean isFinder = request.getFinder().getId().equals(userId);
        if (!isOwner && !isFinder) {
            throw new IllegalArgumentException("Vous n'êtes pas partie à cette négociation");
        }

        if (request.getStatus() != ReturnStatus.PROPOSAL_PENDING) {
            throw new IllegalArgumentException(
                    "Impossible de refuser pour une demande en statut " + request.getStatus());
        }

        // Marquer la dernière offre comme REJECTED
        List<NegotiationOffer> offers = negotiationOfferRepository
                .findByReturnRequestIdOrderByCreatedAtAsc(returnRequestId);
        if (!offers.isEmpty()) {
            NegotiationOffer lastOffer = offers.get(offers.size() - 1);
            lastOffer.setStatus(NegotiationStatus.REJECTED);
            negotiationOfferRepository.save(lastOffer);
        }

        // §8 : refus de la proposition → retour à la discussion, pas d'annulation
        request.setStatus(ReturnStatus.CHAT_ACTIVE);
        request.setProposedAmount(null);
        ReturnRequest saved = returnRequestRepository.save(request);

        // Notifier l'autre partie
        User other = isOwner ? request.getFinder() : request.getLoser();
        notificationRepository.save(Notification.builder()
                .user(other)
                .type(NotificationType.CLAIM)
                .title("Récompense refusée")
                .description(rejector.getName() + " a refusé la proposition de récompense.")
                .read(false)
                .build());

        pushNotification(other.getId(),
                "Récompense refusée",
                "La proposition de récompense a été refusée.",
                "CLAIM");

        log.info("Negotiation rejected for return request {} by user {}", returnRequestId, userId);
        return saved;
    }

    // ════════════════════════════════════════════════════════════
    // Récupérer l'historique des offres
    // ════════════════════════════════════════════════════════════

    public List<NegotiationOffer> getOfferHistory(Long returnRequestId) {
        return negotiationOfferRepository.findByReturnRequestIdOrderByCreatedAtAsc(returnRequestId);
    }

    // ════════════════════════════════════════════════════════════
    // Helpers
    // ════════════════════════════════════════════════════════════

    private void pushNotification(Long userId, String title, String description, String type) {
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
}
