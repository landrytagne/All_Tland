package com.retrouvit.controller;

import com.retrouvit.dto.AuthResponse;
import com.retrouvit.dto.OtpInitResponse;
import com.retrouvit.dto.RegisterRequest;
import com.retrouvit.entity.OtpCode;
import com.retrouvit.entity.User;
import com.retrouvit.repository.UserRepository;
import com.retrouvit.service.OtpService;
import com.retrouvit.service.RegistrationFlowService;
import com.retrouvit.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 2FA par OTP email — cahier des charges §5.1 / §6.1 :
 * - POST /api/auth/otp/request    : (re)envoi d'un code login
 * - POST /api/auth/otp/verify     : vérifie le code et émet les tokens
 * - POST /api/auth/register-otp   : inscription en 2 étapes avec activation par code
 * Règles : code 6 chiffres, expiration 5 min, 5 tentatives max, usage unique.
 */
@RestController
@RequestMapping("/api/auth/otp")
@RequiredArgsConstructor
@Tag(name = "Authentification 2FA (OTP)", description = "Vérification en deux étapes par code email — CDC §5.1/§6.1")
public class OtpController {

    private final OtpService otpService;
    private final UserService userService;
    private final UserRepository userRepository;
    private final RegistrationFlowService registrationFlowService;
    private final com.retrouvit.service.AccountLockoutService accountLockoutService;

    /**
     * Demande d'un OTP de login pour un compte existant.
     * Réponse volontairement identique que le compte existe ou non
     * (pas d'énumération de comptes).
     */
    @PostMapping("/request")
    @Operation(summary = "Demander un code OTP de connexion",
            description = "Envoie un code à 6 chiffres (valable 5 min, 5 tentatives max) à l'email fourni si le compte existe.")
    public ResponseEntity<OtpInitResponse> requestLoginOtp(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim().toLowerCase();
        if (email.isEmpty()) {
            throw new IllegalArgumentException("L'email est obligatoire");
        }
        if (userRepository.findByEmail(email).isEmpty()) {
            // Message neutre : ne pas révéler l'existence du compte
            return ResponseEntity.ok(neutralResponse());
        }
        String masked = otpService.generateAndSendOtp(email, "LOGIN");
        return ResponseEntity.ok(OtpInitResponse.builder()
                .maskedEmail(masked).otpRequired(true)
                .message("Code envoyé — valable 5 minutes")
                .build());
    }

    /**
     * Vérifie le code OTP de login et émet le couple de tokens.
     */
    @PostMapping("/verify")
    @Operation(summary = "Vérifier le code OTP et se connecter",
            description = "Valide le code (usage unique) et retourne access + refresh tokens.")
    public ResponseEntity<AuthResponse> verifyLoginOtp(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim().toLowerCase();
        String code = body.getOrDefault("code", "").trim();
        if (email.isEmpty() || code.isEmpty()) {
            throw new IllegalArgumentException("Email et code sont obligatoires");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Email ou code invalide"));
        if (!Boolean.TRUE.equals(user.getEnabled())) {
            throw new IllegalArgumentException("Ce compte n'est pas activé — utilisez le lien d'inscription");
        }

        // Audit M2/m2 : le verrou et la suspension s'appliquent aussi au flux OTP
        if (accountLockoutService.isLocked(user)) {
            throw new IllegalArgumentException(
                    "Compte temporairement verrouillé après trop de tentatives — réessayez dans "
                            + accountLockoutService.minutesRemaining(user) + " minute(s)");
        }
        if (Boolean.TRUE.equals(user.getBanned())) {
            throw new IllegalArgumentException("Ce compte a été suspendu." +
                    (user.getBanReason() != null ? " Motif : " + user.getBanReason() : ""));
        }

        OtpCode otp = otpService.verifyOtp(email, code, "LOGIN");

        AuthResponse response = userService.buildAuthResponseForVerifiedUser(user);
        return ResponseEntity.ok(response);
    }

    // ─── Inscription en 2 étapes (CDC : register déclenche l'envoi du code) ───

    @PostMapping("/register")
    @Operation(summary = "Étape 1 — Inscription avec envoi du code d'activation",
            description = "Crée le compte (inactif) puis envoie un code à 6 chiffres par email.")
    public ResponseEntity<OtpInitResponse> registerWithOtp(@Valid @RequestBody RegisterRequest request) {
        String masked = registrationFlowService.registerPending(request);
        return ResponseEntity.ok(OtpInitResponse.builder()
                .maskedEmail(masked).otpRequired(true)
                .message("Compte créé — un code d'activation vous a été envoyé par email")
                .build());
    }

    @PostMapping("/register/verify")
    @Operation(summary = "Étape 2 — Activer le compte avec le code reçu",
            description = "Valide le code d'activation (usage unique) et active définitivement le compte.")
    public ResponseEntity<Map<String, String>> verifyRegistration(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim().toLowerCase();
        String code = body.getOrDefault("code", "").trim();
        if (email.isEmpty() || code.isEmpty()) {
            throw new IllegalArgumentException("Email et code sont obligatoires");
        }
        registrationFlowService.completeRegistration(email, code);
        return ResponseEntity.ok(Map.of(
                "message", "Compte activé avec succès — vous pouvez vous connecter",
                "email", email
        ));
    }

    @PostMapping("/register/resend")
    @Operation(summary = "Renvoyer un code d'activation",
            description = "Renvoie un nouveau code pour un compte en attente d'activation.")
    public ResponseEntity<OtpInitResponse> resendRegistrationOtp(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim().toLowerCase();
        if (email.isEmpty()) {
            throw new IllegalArgumentException("L'email est obligatoire");
        }
        String masked = registrationFlowService.resendRegistrationOtp(email);
        return ResponseEntity.ok(OtpInitResponse.builder()
                .maskedEmail(masked).otpRequired(true)
                .message("Nouveau code envoyé — valable 5 minutes")
                .build());
    }

    private OtpInitResponse neutralResponse() {
        return OtpInitResponse.builder()
                .maskedEmail(null).otpRequired(false)
                .message("Si un compte existe avec cet email, un code vient d'être envoyé")
                .build();
    }
}
