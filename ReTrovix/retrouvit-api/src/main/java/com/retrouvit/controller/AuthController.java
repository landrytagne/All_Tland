package com.retrouvit.controller;

import com.retrouvit.dto.*;
import com.retrouvit.entity.User;
import com.retrouvit.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentification", description = "API d'authentification (login, register, refresh, logout)")
public class AuthController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "Obtenir l'utilisateur connecté", description = "Retourne les informations de l'utilisateur authentifié via le token JWT")
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(userService.getUserById(user.getId()));
    }

    @PostMapping("/login")
    @Operation(summary = "Se connecter", description = "Authentifie un utilisateur et retourne un access token + refresh token. Les métadonnées d'appareil (User-Agent, IP) sont enregistrées pour la liste des sessions.")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody AuthRequest request,
            @RequestHeader(value = "User-Agent", required = false) String userAgent,
            HttpServletRequest httpRequest
    ) {
        AuthResponse response = userService.login(request, userAgent, extractClientIp(httpRequest));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    @Operation(
            summary = "Rafraîchir l'access token",
            description = "Échange un refresh token valide contre un nouveau couple access token + refresh token (rotation)"
    )
    public ResponseEntity<AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = userService.refreshAccessToken(request.getRefreshToken());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    @Operation(
            summary = "Se déconnecter",
            description = "Révoque le refresh token pour terminer la session"
    )
    public ResponseEntity<java.util.Map<String, String>> logout(
            @RequestBody(required = false) RefreshTokenRequest request
    ) {
        String refreshToken = request != null ? request.getRefreshToken() : null;
        userService.logout(refreshToken);
        return ResponseEntity.ok(java.util.Map.of(
                "message", "Déconnexion réussie"
        ));
    }

    @PostMapping("/logout-all")
    @Operation(
            summary = "Se déconnecter de tous les appareils",
            description = "Révoque tous les refresh tokens de l'utilisateur"
    )
    public ResponseEntity<java.util.Map<String, String>> logoutAll(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            userService.logoutAll(user.getId());
        }
        return ResponseEntity.ok(java.util.Map.of(
                "message", "Déconnexion de tous les appareils réussie"
        ));
    }

    @GetMapping("/sessions")
    @Operation(
            summary = "Lister les sessions/appareils actifs",
            description = "Retourne les sessions actives de l'utilisateur (CDC §5.1). Le champ current indique la session à l'origine de l'appel."
    )
    public ResponseEntity<List<SessionResponse>> getSessions(
            Authentication authentication,
            @RequestHeader(value = "X-Refresh-Token", required = false) String currentRefreshToken
    ) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(userService.getActiveSessions(user.getId(), currentRefreshToken));
    }

    @DeleteMapping("/sessions/{sessionId}")
    @Operation(
            summary = "Révoquer une session spécifique",
            description = "Déconnecte un appareil distant en révoquant son refresh token. Une session ne peut être révoquée que par son propriétaire."
    )
    public ResponseEntity<java.util.Map<String, String>> revokeSession(
            @PathVariable Long sessionId,
            Authentication authentication
    ) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        userService.revokeSession(user.getId(), sessionId);
        return ResponseEntity.ok(java.util.Map.of("message", "Session révoquée"));
    }

    /** Extrait l'IP réelle du client en tenant compte des proxys (Vercel, nginx). */
    private String extractClientIp(HttpServletRequest request) {
        String[] headers = {"X-Forwarded-For", "X-Real-IP"};
        for (String header : headers) {
            String value = request.getHeader(header);
            if (value != null && !value.isBlank()) {
                // X-Forwarded-For peut contenir une liste : premier = client d'origine
                return value.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    @PostMapping("/forgot-password")
    @Operation(
            summary = "Demander une réinitialisation de mot de passe",
            description = "Génère un token de réinitialisation pour l'email donné. En prod, le token serait envoyé par email."
    )
    public ResponseEntity<java.util.Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        String token = userService.forgotPassword(request.getEmail());
        // In production, send email here. For now, return token in response.
        return ResponseEntity.ok(java.util.Map.of(
                "message", "Un email de réinitialisation a été envoyé à " + request.getEmail(),
                "token", token
        ));
    }

    @PostMapping("/reset-password")
    @Operation(
            summary = "Réinitialiser le mot de passe",
            description = "Utilise le token reçu par email pour définir un nouveau mot de passe"
    )
    public ResponseEntity<java.util.Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        userService.resetPassword(request);
        return ResponseEntity.ok(java.util.Map.of(
                "message", "Mot de passe réinitialisé avec succès"
        ));
    }
}

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Utilisateurs", description = "API de gestion des utilisateurs")
class UserController {

    private final UserService userService;

    @PostMapping
    @Operation(summary = "Créer un utilisateur (register)", description = "Inscrit un nouvel utilisateur")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Lister tous les utilisateurs")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir un utilisateur par ID")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour un utilisateur")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un utilisateur")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
