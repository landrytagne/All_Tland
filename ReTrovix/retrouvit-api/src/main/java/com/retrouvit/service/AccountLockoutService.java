package com.retrouvit.service;

import com.retrouvit.entity.User;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Verrouillage de compte après échecs de connexion — audit M2.
 *
 * - 5 échecs consécutifs → verrou de 15 minutes (anti brute-force) ;
 * - un succès réinitialise le compteur ;
 * - l'incrément est commité dans une transaction indépendante
 *   (REQUIRES_NEW) : il survit au rollback du login en échec ;
 * - le verrou expire seul ; déverrouillage admin possible via
 *   {@link #unlock(User)}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AccountLockoutService {

    static final int MAX_FAILED_ATTEMPTS = 5;
    static final int LOCK_MINUTES = 15;

    private final UserRepository userRepository;

    /** Le compte est-il actuellement verrouillé ? */
    public boolean isLocked(User user) {
        return user.getLockedUntil() != null
                && user.getLockedUntil().isAfter(LocalDateTime.now());
    }

    /** Minutes restantes de verrou (arrondi au-dessus, min 1). */
    public long minutesRemaining(User user) {
        if (user.getLockedUntil() == null) return 0;
        long seconds = java.time.Duration.between(
                LocalDateTime.now(), user.getLockedUntil()).getSeconds();
        return Math.max(1, (seconds + 59) / 60);
    }

    /**
     * Enregistre un échec de connexion. Le compteur est persisté dans une
     * transaction indépendante pour survivre au rollback de l'appelant.
     * Active le verrou au 5e échec consécutif.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailedAttempt(User user) {
        int attempts = (user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts()) + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            user.setLockedUntil(LocalDateTime.now().plusMinutes(LOCK_MINUTES));
            log.warn("Compte {} verrouillé {} min après {} échecs de connexion",
                    user.getEmail(), LOCK_MINUTES, attempts);
        }
        userRepository.save(user);
    }

    /** Réinitialise le compteur après une connexion réussie. */
    @Transactional
    public void recordSuccessfulLogin(User user) {
        if (user.getFailedLoginAttempts() != null && user.getFailedLoginAttempts() > 0
                || user.getLockedUntil() != null) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            userRepository.save(user);
        }
    }

    /** Déverrouillage manuel (back-office/admin). */
    @Transactional
    public void unlock(User user) {
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
        log.info("Compte {} déverrouillé manuellement", user.getEmail());
    }
}
