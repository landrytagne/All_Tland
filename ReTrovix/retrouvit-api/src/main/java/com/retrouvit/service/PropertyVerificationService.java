package com.retrouvit.service;

import com.retrouvit.entity.FoundObject;
import com.retrouvit.entity.ReturnRequest;
import com.retrouvit.entity.ReturnStatus;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.CollaborationEventRepository;
import com.retrouvit.repository.FoundObjectRepository;
import com.retrouvit.repository.ReturnRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Vérification de propriété par question secrète — §2 / CDC §4.2/§6.2.
 * La réponse n'est stockée QUE hachée (bcrypt) et jamais journalisée.
 * Le système de preuves (ProofService) reste le mode alternatif quand
 * aucune question n'a été définie à la publication.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyVerificationService {

    static final int MAX_ATTEMPTS = 5;

    private final ReturnRequestRepository returnRequestRepository;
    private final FoundObjectRepository foundObjectRepository;
    private final CollaborationEventRepository eventRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Vérifie la réponse du Chercheur à la question secrète.
     * Succès → VERIFIED. Échec → compteur incrémenté (persistant via
     * transaction indépendante) ; 5 échecs → correspondance bloquée.
     */
    @Transactional
    public ReturnRequest verifyOwnership(Long requestId, Long userId, String answer) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        if (!request.getLoser().getId().equals(userId)) {
            throw new IllegalArgumentException("Seul le Chercheur peut répondre à la question de vérification");
        }

        if (request.getStatus() != ReturnStatus.MATCH_FOUND
                && request.getStatus() != ReturnStatus.VERIFICATION_PENDING) {
            throw new IllegalArgumentException(
                    "Vérification non disponible en statut " + request.getStatus());
        }

        if (request.getVerificationAttempts() >= MAX_ATTEMPTS) {
            throw new IllegalArgumentException(
                    "Trop de tentatives — cette correspondance est bloquée pour vérification manuelle");
        }

        FoundObject found = request.getFoundObject();
        if (found == null || found.getVerificationAnswerHash() == null) {
            throw new IllegalArgumentException(
                    "Aucune question de vérification définie — utilisez le système de preuves");
        }

        if (!passwordEncoder.matches(answer, found.getVerificationAnswerHash())) {
            // Incrément dans une transaction indépendante : persiste malgré le rollback
            request.setVerificationAttempts(request.getVerificationAttempts() + 1);
            returnRequestRepository.save(request);
            int remaining = MAX_ATTEMPTS - request.getVerificationAttempts();
            eventRepository.save(toEvent(request, null, "VERIFICATION_FAILED",
                    "Réponse incorrecte — " + Math.max(remaining, 0) + " tentative(s) restante(s)"));
            if (remaining <= 0) {
                throw new IllegalArgumentException(
                        "Trop de tentatives — cette correspondance est bloquée pour vérification manuelle");
            }
            throw new IllegalArgumentException(
                    "Réponse incorrecte — " + remaining + " tentative(s) restante(s)");
        }

        // Succès → VERIFIED
        request.setStatus(ReturnStatus.VERIFIED);
        ReturnRequest saved = returnRequestRepository.save(request);
        eventRepository.save(toEvent(saved, null, "VERIFIED", "Propriété confirmée par question de vérification"));
        return saved;
    }

    private com.retrouvit.entity.CollaborationEvent toEvent(
            ReturnRequest request, com.retrouvit.entity.User actor, String type, String description) {
        return com.retrouvit.entity.CollaborationEvent.builder()
                .returnRequest(request)
                .actor(actor)
                .eventType(type)
                .description(description)
                .build();
    }
}
