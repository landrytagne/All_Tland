package com.retrouvit.service;

import com.retrouvit.entity.OtpCode;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.OtpCodeRepository;
import com.retrouvit.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.security.SecureRandom;
import java.time.LocalDateTime;

/**
 * Service OTP 2FA par email — cahier des charges §5.1 / §6.1 :
 * - code à 6 chiffres généré aléatoirement (SecureRandom) ;
 * - stocké haché (bcrypt), jamais en clair ni dans les logs ;
 * - expiration 5 minutes, usage unique ;
 * - 5 tentatives de saisie max, verrouillage au-delà ;
 * - un nouveau code invalide les précédents (même email + usage).
 */
@Service
@Slf4j
public class OtpService {

    static final int OTP_TTL_MINUTES = 5;
    static final int MAX_ATTEMPTS = 5;

    private final OtpCodeRepository otpCodeRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Transaction indépendante (REQUIRES_NEW) : l'incrément du compteur de
     * tentatives doit persister même si la transaction principale est
     * annulée par l'exception de validation.
     */
    private final TransactionTemplate requiresNewTx;

    private final SecureRandom secureRandom = new SecureRandom();

    public OtpService(OtpCodeRepository otpCodeRepository,
                      UserRepository userRepository,
                      EmailService emailService,
                      PasswordEncoder passwordEncoder,
                      PlatformTransactionManager transactionManager) {
        this.otpCodeRepository = otpCodeRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.requiresNewTx = new TransactionTemplate(transactionManager);
        this.requiresNewTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Génère un OTP, le persiste haché et l'envoie par email.
     *
     * @param email   destinataire (compte existant requis)
     * @param purpose LOGIN / REGISTER / PASSWORD_RESET
     * @return masque de l'email pour affichage frontend (ex. j***e@gmail.com)
     */
    @Transactional
    public String generateAndSendOtp(String email, String purpose) {
        // Le compte doit exister — on ne révèle pas l'existence via un message d'erreur dédié
        // (le contrôleur renvoie toujours un message neutre).
        userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        // Un nouveau code invalide les codes actifs précédents
        otpCodeRepository.consumeAllByEmailAndPurpose(email, purpose);

        // Hygiène : purge des codes expirés/consommés
        otpCodeRepository.deleteExpiredOrConsumed(LocalDateTime.now());

        String code = String.format("%06d", secureRandom.nextInt(1_000_000));

        OtpCode otp = OtpCode.builder()
                .email(email)
                .codeHash(passwordEncoder.encode(code))
                .expiresAt(LocalDateTime.now().plusMinutes(OTP_TTL_MINUTES))
                .purpose(purpose)
                .build();
        otpCodeRepository.save(otp);

        emailService.sendOtpEmail(email, code, OTP_TTL_MINUTES);
        log.info("OTP généré pour {} (purpose={}, expiration={} min)", email, purpose, OTP_TTL_MINUTES);

        return maskEmail(email);
    }

    /**
     * Vérifie un OTP : le code doit correspondre, être non expiré,
     * non consommé et sous le seuil de tentatives.
     * En cas d'échec, incrémente le compteur de tentatives.
     */
    @Transactional
    public OtpCode verifyOtp(String email, String code, String purpose) {
        OtpCode otp = otpCodeRepository
                .findFirstByEmailAndPurposeAndConsumedFalseOrderByCreatedAtDesc(email, purpose)
                .orElseThrow(() -> new IllegalArgumentException("Aucun code actif — demandez un nouveau code"));

        if (otp.isExpired()) {
            throw new IllegalArgumentException("Code expiré — demandez un nouveau code");
        }
        if (otp.isLocked()) {
            throw new IllegalArgumentException("Trop de tentatives — demandez un nouveau code");
        }

        if (!passwordEncoder.matches(code, otp.getCodeHash())) {
            // Incrément dans une transaction indépendante : le compteur reste
            // persistant même si la transaction appelante est annulée.
            requiresNewTx.executeWithoutResult(status -> {
                otp.setAttempts(otp.getAttempts() + 1);
                otpCodeRepository.save(otp);
            });
            int remaining = MAX_ATTEMPTS - otp.getAttempts();
            if (remaining <= 0) {
                throw new IllegalArgumentException("Trop de tentatives — demandez un nouveau code");
            }
            throw new IllegalArgumentException("Code incorrect — " + remaining + " tentative(s) restante(s)");
        }

        // Usage unique
        otp.setConsumed(true);
        otpCodeRepository.save(otp);
        return otp;
    }

    /** Masque un email pour l'affichage : j***e@gmail.com */
    public String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 0) return "***";
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.length() <= 2) {
            return local.charAt(0) + "***" + domain;
        }
        return local.charAt(0) + "***" + local.charAt(local.length() - 1) + domain;
    }
}
