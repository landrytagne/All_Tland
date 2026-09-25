package com.retrouvit.controller;

import com.retrouvit.dto.AuthResponse;
import com.retrouvit.service.GoogleAuthService;
import com.retrouvit.service.GoogleTokenVerifier;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * OAuth2 Google — CDC §5.1 (POST /auth/google) / §6.1 (validation
 * serveur avant émission des JWT internes).
 *
 * Deux variantes acceptées :
 * - POST /api/auth/google        { idToken }   → flux Google Identity Services (frontend one-tap/bouton) ;
 * - POST /api/auth/google/code   { code, redirectUri } → flux Authorization Code serveur (CDC).
 *
 * Configuration requise (test différé — credentials à créer dans la
 * console Google Cloud) :
 *   GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Authentification Google", description = "Connexion/inscription via Google OAuth2 — CDC §5.1/§6.1")
public class GoogleAuthController {

    private final GoogleAuthService googleAuthService;
    private final GoogleTokenVerifier googleTokenVerifier;

    @Value("${google.oauth.client-id:}")
    private String clientId;

    @PostMapping("/api/auth/google")
    @Operation(summary = "Connexion Google via id_token (Google Identity Services)",
            description = "Vérifie le id_token côté serveur (signature JWKS, iss, aud, exp, email_verified) puis émet les JWT internes.")
    public ResponseEntity<AuthResponse> loginWithIdToken(@RequestBody Map<String, String> body) {
        String idToken = body.get("idToken");
        if (idToken == null || idToken.isBlank()) {
            throw new IllegalArgumentException("idToken requis");
        }
        GoogleTokenVerifier.GoogleProfile profile = googleTokenVerifier.verifyIdToken(idToken);
        return ResponseEntity.ok(googleAuthService.loginOrRegister(profile));
    }

    @PostMapping("/api/auth/google/code")
    @Operation(summary = "Connexion Google via Authorization Code (flux CDC §6.1)",
            description = "Échange le code contre des tokens Google (secret côté serveur uniquement), récupère le profil puis émet les JWT internes.")
    public ResponseEntity<AuthResponse> loginWithAuthorizationCode(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        String redirectUri = body.getOrDefault("redirectUri",
                "http://localhost:3000/auth/google/callback");
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("code requis");
        }
        GoogleTokenVerifier.GoogleProfile profile =
                googleTokenVerifier.exchangeAuthorizationCode(code, redirectUri);
        return ResponseEntity.ok(googleAuthService.loginOrRegister(profile));
    }

    @GetMapping("/api/auth/google/url")
    @Operation(summary = "URL d'autorisation Google à ouvrir côté client",
            description = "Construit l'URL du consentement Google à partir du client_id configuré.")
    public ResponseEntity<Map<String, String>> authorizationUrl(
            @RequestParam(defaultValue = "http://localhost:3000/auth/google/callback") String redirectUri
    ) {
        String url = "https://accounts.google.com/o/oauth2/v2/auth"
                + "?client_id=" + clientId
                + "&redirect_uri=" + redirectUri
                + "&response_type=code"
                + "&scope=openid%20email%20profile"
                + "&access_type=offline"
                + "&prompt=select_account";
        return ResponseEntity.ok(Map.of("url", url));
    }
}
