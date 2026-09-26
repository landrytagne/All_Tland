package com.retrouvit.service;

import com.retrouvit.entity.ReturnRequest;
import com.retrouvit.repository.CollaborationEventRepository;
import com.retrouvit.repository.ReturnRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Incrément persistant du compteur d'échecs de vérification (§2).
 *
 * Bug corrigé : l'incrément était effectué dans la même transaction que
 * {@code PropertyVerificationService.verifyOwnership}, puis une exception
 * était levée → rollback → le compteur revenait à sa valeur précédente et
 * les 5 tentatives max (§2) étaient inopérantes (compteur bloqué à 0).
 * Même mécanisme que OtpService (T1) : transaction REQUIRES_NEW pour que
 * l'incrément soit commis indépendamment du rollback de l'appelant.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VerificationAttemptService {

    private final ReturnRequestRepository returnRequestRepository;
    private final CollaborationEventRepository eventRepository;

    /**
     * Incrémente et commite immédiatement le compteur d'échecs, dans une
     * transaction indépendante de celle de l'appelant (qui va rollbacker).
     * @return le nombre de tentatives restantes
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int recordFailedAttempt(ReturnRequest request, int maxAttempts) {
        request.setVerificationAttempts(request.getVerificationAttempts() + 1);
        returnRequestRepository.saveAndFlush(request);
        int remaining = maxAttempts - request.getVerificationAttempts();
        try {
            eventRepository.save(com.retrouvit.entity.CollaborationEvent.builder()
                    .returnRequest(request)
                    .actor(null)
                    .eventType("VERIFICATION_FAILED")
                    .description("Réponse incorrecte — " + Math.max(remaining, 0) + " tentative(s) restante(s)")
                    .build());
        } catch (Exception e) {
            log.error("Impossible de tracer l'échec de vérification : {}", e.getMessage());
        }
        log.info("Échec de vérification {} : {}/{} tentatives utilisées",
                request.getReference(), request.getVerificationAttempts(), maxAttempts);
        return remaining;
    }
}
