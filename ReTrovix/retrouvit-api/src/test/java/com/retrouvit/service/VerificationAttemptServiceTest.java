package com.retrouvit.service;

import com.retrouvit.entity.CollaborationEvent;
import com.retrouvit.entity.ReturnRequest;
import com.retrouvit.repository.CollaborationEventRepository;
import com.retrouvit.repository.ReturnRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Bug corrigé : le compteur d'échecs de vérification (§2) doit être persisté
 * dans une transaction indépendante (REQUIRES_NEW), sinon le rollback de
 * verifyOwnership l'annule et les 5 tentatives max sont inopérantes
 * (le compteur restait bloqué à 0 — même bug que l'OTP, T1).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("VerificationAttemptService — compteur d'échecs persistant (§2)")
class VerificationAttemptServiceTest {

    @Mock
    private ReturnRequestRepository returnRequestRepository;
    @Mock
    private CollaborationEventRepository eventRepository;

    @InjectMocks
    private VerificationAttemptService verificationAttemptService;

    private ReturnRequest request;

    @BeforeEach
    void setUp() {
        request = ReturnRequest.builder()
                .id(10L)
                .reference("RET-TEST0001")
                .verificationAttempts(0)
                .build();

        when(returnRequestRepository.saveAndFlush(any(ReturnRequest.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("recordFailedAttempt est bien annoté REQUIRES_NEW (contrat de persistance)")
    void requiresNewAnnotationIsPresent() throws NoSuchMethodException {
        var method = VerificationAttemptService.class
                .getMethod("recordFailedAttempt", ReturnRequest.class, int.class);
        var annotation = method.getAnnotation(Transactional.class);

        assertThat(annotation).as("L'annotation @Transactional doit être présente").isNotNull();
        assertThat(annotation.propagation())
                .as("La propagation DOIT être REQUIRES_NEW pour survivre au rollback appelant")
                .isEqualTo(Propagation.REQUIRES_NEW);
    }

    @Test
    @DisplayName("1er échec : compteur 1, 4 tentatives restantes, événement tracé")
    void firstAttemptIncrements() {
        int remaining = verificationAttemptService.recordFailedAttempt(request, 5);

        assertThat(remaining).isEqualTo(4);
        assertThat(request.getVerificationAttempts()).isEqualTo(1);
        verify(returnRequestRepository).saveAndFlush(request);

        ArgumentCaptor<CollaborationEvent> evCaptor = ArgumentCaptor.forClass(CollaborationEvent.class);
        verify(eventRepository).save(evCaptor.capture());
        assertThat(evCaptor.getValue().getEventType()).isEqualTo("VERIFICATION_FAILED");
        assertThat(evCaptor.getValue().getDescription()).contains("4 tentative(s)");
    }

    @Test
    @DisplayName("5 appels successifs épuisent les tentatives (0 restant)")
    void fiveAttemptsExhaust() {
        for (int i = 1; i <= 5; i++) {
            int remaining = verificationAttemptService.recordFailedAttempt(request, 5);
            assertThat(remaining).isEqualTo(5 - i);
        }
        assertThat(request.getVerificationAttempts()).isEqualTo(5);
        verify(returnRequestRepository, times(5)).saveAndFlush(any(ReturnRequest.class));
    }

    @Test
    @DisplayName("Compteur reparti de zéro : les 5 essais max sont désormais opérants")
    void counterIsNoLongerStuckAtZero() {
        // Simulation du bug corrigé : avant, le compteur revenait à 0 après
        // chaque échec (rollback). Ici l'incrément EST fait sur l'entité gérée.
        verificationAttemptService.recordFailedAttempt(request, 5);
        verificationAttemptService.recordFailedAttempt(request, 5);
        int remaining = verificationAttemptService.recordFailedAttempt(request, 5);

        assertThat(request.getVerificationAttempts()).isEqualTo(3);
        assertThat(remaining).isEqualTo(2);
    }

    @Test
    @DisplayName("Un échec d'audit ne fait pas échouer l'enregistrement")
    void auditFailureIsSilent() {
        when(eventRepository.save(any(CollaborationEvent.class)))
                .thenThrow(new RuntimeException("DB down"));

        assertThatCode(() -> verificationAttemptService.recordFailedAttempt(request, 5))
                .doesNotThrowAnyException();
        assertThat(request.getVerificationAttempts()).isEqualTo(1);
        verify(returnRequestRepository).saveAndFlush(request);
    }
}
