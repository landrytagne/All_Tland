package com.retrouvit.service;

import com.retrouvit.controller.WebSocketNotificationController;
import com.retrouvit.dto.NotificationWsMessage;
import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.NotificationRepository;
import com.retrouvit.repository.ProofRepository;
import com.retrouvit.repository.ReturnRequestRepository;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProofService {

    private final ProofRepository proofRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final WebSocketNotificationController wsNotificationController;

    /** Limite maximale de demandes d'info supplémentaire */
    private static final int MAX_ADDITIONAL_INFO_REQUESTS = 3;

    // ════════════════════════════════════════════════════════════
    // Soumettre des preuves
    // ════════════════════════════════════════════════════════════

    @Transactional
    public Proof submitProof(Long returnRequestId, Long userId, Proof proofData) {
        ReturnRequest request = returnRequestRepository.findById(returnRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        User finder = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        // Seul le trouveur peut soumettre des preuves
        if (!request.getFinder().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le retrouveur peut soumettre des preuves");
        }

        // Vérifier que la demande est dans un état valide pour soumettre des preuves
        if (request.getStatus() != ReturnStatus.MATCH_FOUND
                && request.getStatus() != ReturnStatus.VERIFICATION_PENDING
                && request.getStatus() != ReturnStatus.VERIFICATION_PENDING) {
            throw new IllegalArgumentException(
                    "Impossible de soumettre des preuves pour une demande en statut " + request.getStatus());
        }

        // Créer la preuve
        Proof proof = Proof.builder()
                .returnRequest(request)
                .submittedBy(finder)
                .description(proofData.getDescription())
                .characteristics(proofData.getCharacteristics())
                .condition(proofData.getCondition())
                .discoveryLocation(proofData.getDiscoveryLocation())
                .discoveryDateTime(proofData.getDiscoveryDateTime())
                .serialNumber(proofData.getSerialNumber())
                .technicalInfo(proofData.getTechnicalInfo())
                .photos(proofData.getPhotos())
                .status(ProofStatus.SUBMITTED)
                .build();

        Proof saved = proofRepository.save(proof);

        // Mettre à jour le statut de la demande
        request.setStatus(ReturnStatus.VERIFICATION_PENDING);
        request.setProofStatus(ProofStatus.SUBMITTED);
        returnRequestRepository.save(request);

        // Notifier le propriétaire
        notificationRepository.save(Notification.builder()
                .user(request.getLoser())
                .type(NotificationType.CLAIM)
                .title("Preuves soumises")
                .description(finder.getName() + " a soumis des preuves pour l'objet : "
                        + (request.getLostObject() != null ? request.getLostObject().getTitle() : "objet"))
                .read(false)
                .build());

        // WebSocket push
        pushNotification(request.getLoser().getId(),
                "Preuves soumises", "Le retrouveur a soumis des preuves.", "CLAIM");

        log.info("Proof submitted for return request {} by user {}", returnRequestId, userId);
        return saved;
    }

    // ════════════════════════════════════════════════════════════
    // Demander plus d'informations
    // ════════════════════════════════════════════════════════════

    @Transactional
    public Proof requestMoreInfo(Long returnRequestId, Long userId, String note) {
        ReturnRequest request = returnRequestRepository.findById(returnRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        // Seul le propriétaire peut demander plus d'infos
        if (!request.getLoser().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le propriétaire peut demander plus d'informations");
        }

        // Vérifier le statut
        if (request.getStatus() != ReturnStatus.VERIFICATION_PENDING) {
            throw new IllegalArgumentException(
                    "Impossible de demander plus d'infos pour une demande en statut " + request.getStatus());
        }

        // Vérifier la limite de demandes
        long existingRequests = proofRepository.countByReturnRequestIdAndStatus(
                returnRequestId, ProofStatus.NEED_MORE_INFO);
        if (existingRequests >= MAX_ADDITIONAL_INFO_REQUESTS) {
            throw new IllegalArgumentException(
                    "Nombre maximum de demandes d'informations atteint (" + MAX_ADDITIONAL_INFO_REQUESTS + ")");
        }

        // Mettre à jour la dernière preuve
        Proof latestProof = proofRepository
                .findFirstByReturnRequestIdAndStatusOrderByCreatedAtDesc(returnRequestId, ProofStatus.SUBMITTED)
                .orElse(null);

        if (latestProof != null) {
            latestProof.setStatus(ProofStatus.NEED_MORE_INFO);
            latestProof.setReviewNote(note);
            latestProof.setAdditionalInfoRequests(latestProof.getAdditionalInfoRequests() + 1);
            proofRepository.save(latestProof);
        }

        // Mettre à jour le statut de la demande
        request.setStatus(ReturnStatus.VERIFICATION_PENDING);
        request.setProofStatus(ProofStatus.NEED_MORE_INFO);
        returnRequestRepository.save(request);

        // Notifier le trouveur
        notificationRepository.save(Notification.builder()
                .user(request.getFinder())
                .type(NotificationType.CLAIM)
                .title("Informations supplémentaires demandées")
                .description("Le propriétaire demande des informations supplémentaires : " + note)
                .read(false)
                .build());

        // WebSocket push
        pushNotification(request.getFinder().getId(),
                "Informations demandées", "Le propriétaire souhaite des informations supplémentaires.", "CLAIM");

        log.info("More info requested for return request {} by user {}", returnRequestId, userId);
        return latestProof;
    }

    // ════════════════════════════════════════════════════════════
    // Confirmer la propriété (approuver les preuves)
    // ════════════════════════════════════════════════════════════

    @Transactional
    public ReturnRequest confirmOwnership(Long returnRequestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(returnRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        // Seul le propriétaire peut confirmer
        if (!request.getLoser().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le propriétaire peut confirmer la propriété");
        }

        // Vérifier le statut
        if (request.getStatus() != ReturnStatus.VERIFICATION_PENDING) {
            throw new IllegalArgumentException(
                    "Impossible de confirmer la propriété pour une demande en statut " + request.getStatus());
        }

        // Approuver la dernière preuve
        Proof latestProof = proofRepository
                .findFirstByReturnRequestIdAndStatusOrderByCreatedAtDesc(returnRequestId, ProofStatus.SUBMITTED)
                .orElse(null);

        if (latestProof != null) {
            latestProof.setStatus(ProofStatus.APPROVED);
            proofRepository.save(latestProof);
        }

        // Mettre à jour le statut de la demande
        request.setStatus(ReturnStatus.VERIFIED);
        request.setProofStatus(ProofStatus.APPROVED);
        ReturnRequest saved = returnRequestRepository.save(request);

        // Notifier le trouveur
        notificationRepository.save(Notification.builder()
                .user(request.getFinder())
                .type(NotificationType.MATCH)
                .title("Propriété confirmée !")
                .description("Le propriétaire a confirmé que l'objet est bien le sien. "
                        + "Vous pouvez maintenant discuter de la récompense.")
                .read(false)
                .build());

        // WebSocket push
        pushNotification(request.getFinder().getId(),
                "Propriété confirmée", "Le propriétaire confirme que c'est son objet !", "MATCH");

        log.info("Ownership confirmed for return request {} by user {}", returnRequestId, userId);
        return saved;
    }

    // ════════════════════════════════════════════════════════════
    // Rejeter les preuves
    // ════════════════════════════════════════════════════════════

    @Transactional
    public ReturnRequest rejectProof(Long returnRequestId, Long userId, String reason) {
        ReturnRequest request = returnRequestRepository.findById(returnRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retour non trouvée"));

        // Seul le propriétaire peut rejeter
        if (!request.getLoser().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le propriétaire peut rejeter les preuves");
        }

        // Vérifier le statut
        if (request.getStatus() != ReturnStatus.VERIFICATION_PENDING) {
            throw new IllegalArgumentException(
                    "Impossible de rejeter les preuves pour une demande en statut " + request.getStatus());
        }

        // Rejeter la dernière preuve
        Proof latestProof = proofRepository
                .findFirstByReturnRequestIdAndStatusOrderByCreatedAtDesc(returnRequestId, ProofStatus.SUBMITTED)
                .orElse(null);

        if (latestProof != null) {
            latestProof.setStatus(ProofStatus.REJECTED);
            latestProof.setReviewNote(reason);
            proofRepository.save(latestProof);
        }

        // Mettre à jour le statut de la demande
        request.setStatus(ReturnStatus.REJECTED);
        request.setProofStatus(ProofStatus.REJECTED);
        ReturnRequest saved = returnRequestRepository.save(request);

        // Notifier le trouveur
        notificationRepository.save(Notification.builder()
                .user(request.getFinder())
                .type(NotificationType.CLAIM)
                .title("Preuves rejetées")
                .description("Le propriétaire a rejeté les preuves. Raison : " + reason)
                .read(false)
                .build());

        // WebSocket push
        pushNotification(request.getFinder().getId(),
                "Preuves rejetées", "Le propriétaire a rejeté les preuves.", "CLAIM");

        log.info("Proof rejected for return request {} by user {}: {}", returnRequestId, userId, reason);
        return saved;
    }

    // ════════════════════════════════════════════════════════════
    // Récupérer les preuves d'une demande
    // ════════════════════════════════════════════════════════════

    public List<Proof> getProofs(Long returnRequestId) {
        return proofRepository.findByReturnRequestIdOrderByCreatedAtDesc(returnRequestId);
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
