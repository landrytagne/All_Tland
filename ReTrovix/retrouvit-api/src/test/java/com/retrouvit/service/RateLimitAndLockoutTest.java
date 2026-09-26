package com.retrouvit.service;

import com.retrouvit.entity.User;
import com.retrouvit.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Audit M1 (rate limiting) et M2 (verrouillage de compte).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Rate limiting (M1) et verrouillage de compte (M2)")
class RateLimitAndLockoutTest {

    // ─── M1 : rate limiting ──────────────────────────────────

    @Nested
    @DisplayName("M1 — RateLimitService")
    class RateLimit {

        private RateLimitService rateLimitService;

        @BeforeEach
        void setUp() {
            rateLimitService = new RateLimitService();
        }

        @Test
        @DisplayName("Laisse passer jusqu'à la limite puis bloque (429 côté filtre)")
        void allowsUpToLimitThenBlocks() {
            var limit = new RateLimitService.Limit(3, 60);
            String key = "1.2.3.4:/api/auth/login";

            assertThat(rateLimitService.tryAcquire(key, limit)).isTrue();
            assertThat(rateLimitService.tryAcquire(key, limit)).isTrue();
            assertThat(rateLimitService.tryAcquire(key, limit)).isTrue();
            assertThat(rateLimitService.tryAcquire(key, limit))
                    .as("La 4e requête dans la fenêtre doit être bloquée")
                    .isFalse();
        }

        @Test
        @DisplayName("Des clés différentes ont des compteurs indépendants")
        void keysAreIndependent() {
            var limit = new RateLimitService.Limit(1, 60);
            assertThat(rateLimitService.tryAcquire("ip1:/login", limit)).isTrue();
            assertThat(rateLimitService.tryAcquire("ip1:/login", limit)).isFalse();
            assertThat(rateLimitService.tryAcquire("ip2:/login", limit))
                    .as("Une autre IP n'est pas affectée")
                    .isTrue();
        }

        @Test
        @DisplayName("reset() débloque immédiatement une clé")
        void resetUnblocks() {
            var limit = new RateLimitService.Limit(1, 60);
            String key = "ip:/login";
            rateLimitService.tryAcquire(key, limit);
            assertThat(rateLimitService.tryAcquire(key, limit)).isFalse();
            rateLimitService.reset(key);
            assertThat(rateLimitService.tryAcquire(key, limit)).isTrue();
        }

        @Test
        @DisplayName("La fenêtre expirée autorise à nouveau (expiresAt passé)")
        void expiredWindowAllowsAgain() throws Exception {
            var limit = new RateLimitService.Limit(1, 60);
            String key = "ip:/otp";

            assertThat(rateLimitService.tryAcquire(key, limit)).isTrue();
            assertThat(rateLimitService.tryAcquire(key, limit)).isFalse();

            // Remplace l'entrée par une fenêtre déjà expirée (réflexion sur le record)
            var field = RateLimitService.class.getDeclaredField("windows");
            field.setAccessible(true);
            @SuppressWarnings("unchecked")
            var map = (java.util.concurrent.ConcurrentHashMap<String, Object>) field.get(rateLimitService);
            var windowClass = Class.forName("com.retrouvit.service.RateLimitService$Window");
            var constructor = windowClass.getDeclaredConstructor(long.class, java.util.concurrent.atomic.AtomicInteger.class);
            constructor.setAccessible(true);
            Object expired = constructor.newInstance(
                    System.currentTimeMillis() - 1000, new java.util.concurrent.atomic.AtomicInteger(99));
            map.put(key, expired);

            assertThat(rateLimitService.tryAcquire(key, limit))
                    .as("Une fenêtre expirée repart de zéro")
                    .isTrue();
        }

        @Test
        @DisplayName("Débits : auth 10/min, OTP 5/min")
        void configuredLimits() {
            assertThat(RateLimitService.authLimit().maxRequests()).isEqualTo(10);
            assertThat(RateLimitService.authLimit().windowSeconds()).isEqualTo(60);
            assertThat(RateLimitService.otpLimit().maxRequests()).isEqualTo(5);
        }
    }

    // ─── M2 : verrouillage de compte ─────────────────────────

    @Nested
    @DisplayName("M2 — AccountLockoutService")
    class Lockout {

        @Mock
        private UserRepository userRepository;

        @InjectMocks
        private AccountLockoutService lockoutService;

        private User user;

        @BeforeEach
        void setUp() {
            user = User.builder().id(1L).email("jean@test.com")
                    .failedLoginAttempts(0).build();
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        }

        @Test
        @DisplayName("4 échecs : pas de verrou ; au 5e : verrou 15 min")
        void locksAtFifthAttempt() {
            for (int i = 1; i <= 4; i++) {
                lockoutService.recordFailedAttempt(user);
                assertThat(lockoutService.isLocked(user)).isFalse();
            }
            lockoutService.recordFailedAttempt(user);
            assertThat(lockoutService.isLocked(user)).isTrue();
            assertThat(user.getLockedUntil()).isAfter(LocalDateTime.now().plusMinutes(14));
            assertThat(user.getFailedLoginAttempts()).isEqualTo(5);
        }

        @Test
        @DisplayName("recordFailedAttempt est REQUIRES_NEW (survit au rollback du login)")
        void failedAttemptIsRequiresNew() throws NoSuchMethodException {
            var m = AccountLockoutService.class.getMethod("recordFailedAttempt", User.class);
            var tx = m.getAnnotation(org.springframework.transaction.annotation.Transactional.class);
            assertThat(tx).isNotNull();
            assertThat(tx.propagation())
                    .isEqualTo(org.springframework.transaction.annotation.Propagation.REQUIRES_NEW);
        }

        @Test
        @DisplayName("Une connexion réussie réinitialise le compteur et le verrou")
        void successfulLoginResets() {
            user.setFailedLoginAttempts(3);
            lockoutService.recordSuccessfulLogin(user);
            assertThat(user.getFailedLoginAttempts()).isZero();
            assertThat(user.getLockedUntil()).isNull();
        }

        @Test
        @DisplayName("Le verrou expire seul (passé → non verrouillé)")
        void lockExpires() {
            user.setLockedUntil(LocalDateTime.now().minusMinutes(1));
            assertThat(lockoutService.isLocked(user)).isFalse();
        }

        @Test
        @DisplayName("minutesRemaining : arrondi au-dessus, min 1")
        void minutesRemainingRoundsUp() {
            user.setLockedUntil(LocalDateTime.now().plusSeconds(30));
            assertThat(lockoutService.minutesRemaining(user)).isEqualTo(1);
            user.setLockedUntil(LocalDateTime.now().plusMinutes(14).plusSeconds(30));
            assertThat(lockoutService.minutesRemaining(user)).isEqualTo(15);
        }

        @Test
        @DisplayName("unlock() administrateur remet tout à zéro")
        void adminUnlock() {
            user.setFailedLoginAttempts(5);
            user.setLockedUntil(LocalDateTime.now().plusMinutes(15));
            lockoutService.unlock(user);
            assertThat(user.getFailedLoginAttempts()).isZero();
            assertThat(user.getLockedUntil()).isNull();
            verify(userRepository).save(user);
        }
    }
}
