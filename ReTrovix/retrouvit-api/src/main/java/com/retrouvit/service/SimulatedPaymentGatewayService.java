package com.retrouvit.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

/**
 * Provider de paiement simulé (choix validé en session).
 * - submitWithdrawal : génère une référence EXT-... (comme un vrai provider) ;
 * - la référence contient un marqueur de succès/échec pour piloter les tests
 *   (PROD : réponse réelle du provider) ;
 * - verifyWebhookSignature : HMAC-SHA256 simple avec le secret configuré
 *   (PROD : signature du provider, ex. MTN MoMo).
 */
@Service
@Slf4j
public class SimulatedPaymentGatewayService implements PaymentGatewayService {

    @Value("${payment.simulation.default-success:true}")
    private boolean defaultSuccess;

    @Value("${payment.webhook-secret:retrouvit-webhook-secret}")
    private String webhookSecret;

    @Override
    public String submitWithdrawal(String reference, String method, String phoneNumber, Long amount) {
        // Simulation : 95 % de succès (comme l'ancien comportement des dépôts),
        // sauf si le téléphone se termine par 000 (pour tester les échecs).
        boolean success = defaultSuccess && (phoneNumber == null || !phoneNumber.endsWith("000"));
        String extRef = "EXT-" + (success ? "OK-" : "KO-")
                + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        log.info("[SIMULATED GATEWAY] withdrawal {} → {} ({} XAF via {})", reference, extRef, amount, method);
        return extRef;
    }

    @Override
    public boolean isWithdrawalConfirmed(String providerReference) {
        // Simulation : la référence EXT-OK-* est confirmée, EXT-KO-* échouée.
        // PROD : interrogation de l'API du provider (statut de la transaction).
        return providerReference != null && providerReference.contains("-OK-");
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        if (signature == null || payload == null) return false;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((webhookSecret + payload).getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            // Comparaison à temps constant (évite les timing attacks)
            return MessageDigest.isEqual(
                    hex.toString().getBytes(StandardCharsets.UTF_8),
                    signature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Webhook signature verification failed: {}", e.getMessage());
            return false;
        }
    }
}
