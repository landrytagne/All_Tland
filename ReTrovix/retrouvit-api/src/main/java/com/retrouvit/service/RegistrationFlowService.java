package com.retrouvit.service;

import com.retrouvit.entity.User;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Workflow d'inscription avec 2FA par OTP (CDC §5.1) :
 * 1. registerPending : crée le compte (inactif) + envoie le code OTP ;
 * 2. completeRegistration : valide l'OTP, active le compte, émet les tokens.
 * Tant que le compte n'est pas activé, le login est refusé avec un
 * message incitant à vérifier l'email.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RegistrationFlowService {

    private final UserRepository userRepository;
    private final OtpService otpService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Étape 1 : crée le compte inactif et déclenche l'envoi du code.
     * Retourne l'email masqué pour l'affichage.
     */
    @Transactional
    public String registerPending(com.retrouvit.dto.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Un compte existe déjà avec cet email");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(com.retrouvit.entity.Role.USER)
                .twoFactorEnabled(true) // 2FA par défaut pour les comptes locaux (CDC §4.1)
                .build();
        userRepository.save(user);

        return otpService.generateAndSendOtp(request.getEmail(), "REGISTER");
    }

    /**
     * Étape 2 : valide l'OTP et active le compte.
     * Les tokens ne sont PAS émis ici — l'utilisateur est redirigé vers
     * la page de connexion (flux standard, plus sûr et conforme à la
     * page verify-otp existante du frontend).
     */
    @Transactional
    public void completeRegistration(String email, String code) {
        otpService.verifyOtp(email, code, "REGISTER");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new com.retrouvit.exception.ResourceNotFoundException("Utilisateur non trouvé"));
        user.setEnabled(true);
        user.setEmailVerified(true);
        userRepository.save(user);
    }

    /** Renvoi d'un code pour un compte en attente d'activation. */
    @Transactional
    public String resendRegistrationOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new com.retrouvit.exception.ResourceNotFoundException("Utilisateur non trouvé"));
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new IllegalArgumentException("Ce compte est déjà activé — connectez-vous");
        }
        return otpService.generateAndSendOtp(email, "REGISTER");
    }
}
