package com.retrouvit.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Validation des identités Google côté serveur — CDC §6.1 :
 * « OAuth2 Google via le flux Authorization Code, validation du token
 * côté serveur avant émission des JWT internes ».
 *
 * Deux cas supportés :
 * 1. id_token JWT (Google Identity Services) : vérification de signature
 *    RS256 via les clés publiques JWKS de Google + claims (iss, aud, exp, email_verified) ;
 * 2. code d'autorisation (flux Authorization Code du CDC) : échange
 *    serveur-à-serveur contre token_endpoint puis appel userinfo.
 */
@Service
@Slf4j
public class GoogleTokenVerifier {

    private static final String GOOGLE_ISSUER = "https://accounts.google.com";
    private static final String JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
    private static final String TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
    private static final String USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${google.oauth.client-id:}")
    private String clientId;

    @Value("${google.oauth.client-secret:}")
    private String clientSecret;

    /** Cache des clés publiques Google (kid → clé). */
    private final Map<String, RSAPublicKey> jwksCache = new HashMap<>();
    private long jwksFetchedAt = 0;

    public GoogleTokenVerifier() {
        this.webClient = WebClient.builder().build();
    }

    /** Profil Google vérifié. */
    public record GoogleProfile(String email, String name, String picture, String subject) {}

    /**
     * Vérifie un id_token Google (flux Google Identity Services).
     * Retourne le profil ou lève une exception si invalide.
     */
    public GoogleProfile verifyIdToken(String idToken) {
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length != 3) throw new IllegalArgumentException("id_token malformé");

            JsonNode header = objectMapper.readValue(decode(parts[0]), JsonNode.class);
            JsonNode payload = objectMapper.readValue(decode(parts[1]), JsonNode.class);

            // 1. Signature RS256 via JWKS
            if (!"RS256".equals(header.path("alg").asText())) {
                throw new IllegalArgumentException("Algorithme non supporté");
            }
            String kid = header.path("kid").asText();
            RSAPublicKey key = getGoogleKey(kid);
            if (!verifyRs256(parts[0] + "." + parts[1], parts[2], key)) {
                throw new IllegalArgumentException("Signature id_token invalide");
            }

            // 2. Claims : émetteur, audience, expiration, email vérifié
            if (!GOOGLE_ISSUER.equals(payload.path("iss").asText())) {
                throw new IllegalArgumentException("Émetteur inattendu");
            }
            if (clientId != null && !clientId.isBlank()
                    && !clientId.equals(payload.path("aud").asText())) {
                throw new IllegalArgumentException("Audience (client_id) invalide");
            }
            long exp = payload.path("exp").asLong();
            if (Instant.now().getEpochSecond() > exp) {
                throw new IllegalArgumentException("id_token expiré");
            }
            if (!payload.path("email_verified").asBoolean(false)) {
                throw new IllegalArgumentException("Email Google non vérifié");
            }

            return new GoogleProfile(
                    payload.path("email").asText(),
                    payload.path("name").asText(null),
                    payload.path("picture").asText(null),
                    payload.path("sub").asText());
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erreur validation id_token Google: {}", e.getMessage());
            throw new IllegalArgumentException("id_token Google invalide");
        }
    }

    /**
     * Flux Authorization Code (CDC) : échange le code contre des tokens
     * puis récupère le profil via userinfo. Validation intégralement
     * serveur (le secret ne quitte jamais le backend).
     */
    public GoogleProfile exchangeAuthorizationCode(String code, String redirectUri) {
        try {
            JsonNode tokenResponse = webClient.post()
                    .uri(TOKEN_ENDPOINT)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .bodyValue("code=" + code
                            + "&client_id=" + clientId
                            + "&client_secret=" + clientSecret
                            + "&redirect_uri=" + redirectUri
                            + "&grant_type=authorization_code")
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (tokenResponse == null || tokenResponse.has("error")) {
                throw new IllegalArgumentException("Échange du code d'autorisation refusé par Google");
            }

            JsonNode userInfo = webClient.get()
                    .uri(USERINFO_ENDPOINT)
                    .header("Authorization", "Bearer " + tokenResponse.path("access_token").asText())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (userInfo == null || !userInfo.path("email_verified").asBoolean(false)) {
                throw new IllegalArgumentException("Profil Google incomplet ou email non vérifié");
            }

            return new GoogleProfile(
                    userInfo.path("email").asText(),
                    userInfo.path("name").asText(null),
                    userInfo.path("picture").asText(null),
                    userInfo.path("sub").asText());
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erreur échange code Google: {}", e.getMessage());
            throw new IllegalArgumentException("Authentification Google impossible");
        }
    }

    // ─── JWKS ────────────────────────────────────────────────────────

    private RSAPublicKey getGoogleKey(String kid) throws Exception {
        if (jwksCache.isEmpty() || Instant.now().toEpochMilli() - jwksFetchedAt > 3_600_000) {
            JsonNode jwks = webClient.get().uri(JWKS_URL)
                    .retrieve().bodyToMono(JsonNode.class).block();
            if (jwks != null) {
                for (JsonNode k : jwks.path("keys")) {
                    if ("RSA".equals(k.path("kty").asText())) {
                        BigInteger n = new BigInteger(1, Base64.getUrlDecoder().decode(k.path("n").asText()));
                        BigInteger e = new BigInteger(1, Base64.getUrlDecoder().decode(k.path("e").asText()));
                        RSAPublicKey pub = (RSAPublicKey) KeyFactory.getInstance("RSA")
                                .generatePublic(new RSAPublicKeySpec(n, e));
                        jwksCache.put(k.path("kid").asText(), pub);
                    }
                }
            }
            jwksFetchedAt = Instant.now().toEpochMilli();
        }
        RSAPublicKey key = jwksCache.get(kid);
        if (key == null) throw new IllegalArgumentException("Clé Google inconnue (kid)");
        return key;
    }

    private boolean verifyRs256(String signedContent, String signatureB64, RSAPublicKey key) throws Exception {
        Signature sig = Signature.getInstance("SHA256withRSA");
        sig.initVerify(key);
        sig.update(signedContent.getBytes());
        return sig.verify(Base64.getUrlDecoder().decode(signatureB64));
    }

    private String decode(String part) {
        return new String(Base64.getUrlDecoder().decode(part));
    }
}
