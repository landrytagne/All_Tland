package com.retrouvit.controller;

import com.retrouvit.dto.WithdrawalResponse;
import com.retrouvit.service.PaymentGatewayService;
import com.retrouvit.service.ReconciliationService;
import com.retrouvit.service.WithdrawalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints finance :
 * - POST /api/payments/webhook  : callback provider (public, signature vérifiée) ;
 * - GET  /api/finance/withdrawals/pending : file de validation (ADMIN, CDC §8.2) ;
 * - PUT  /api/finance/withdrawals/{id}/review : valider/rejeter (ADMIN) ;
 * - POST /api/finance/reconcile : réconciliation manuelle (ADMIN).
 */
@RestController
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Finance", description = "Webhook provider, validation des retraits et réconciliation — CDC §8")
public class FinanceController {

    private final PaymentGatewayService paymentGateway;
    private final WithdrawalService withdrawalService;
    private final ReconciliationService reconciliationService;

    /**
     * Webhook du provider de paiement (CDC §5.4/§8.1).
     * Public mais signé : la signature est vérifiée avant tout traitement ;
     * un payload non authentique est ignoré (200 pour éviter les retries).
     */
    @PostMapping("/api/payments/webhook")
    @Operation(summary = "Webhook provider de paiement (signature requise)",
            description = "Callback asynchrone du provider. Header X-Webhook-Signature obligatoire.")
    public ResponseEntity<Map<String, String>> paymentWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Webhook-Signature", required = false) String signature
    ) {
        if (!paymentGateway.verifyWebhookSignature(payload, signature)) {
            log.warn("Webhook paiement rejeté : signature invalide");
            return ResponseEntity.ok(Map.of("status", "ignored"));
        }
        // PROD : dispatcher sur les événements du provider (payment.success,
        // withdrawal.completed...) pour mettre à jour paiements et retraits.
        log.info("Webhook paiement authentique reçu ({} octets)", payload.length());
        return ResponseEntity.ok(Map.of("status", "received"));
    }

    // ─── Back-office finance (ADMIN) ──────────────────────────────

    @GetMapping("/api/finance/withdrawals/pending")
    @Operation(summary = "[ADMIN] Retraits en attente de validation finance")
    public ResponseEntity<List<WithdrawalResponse>> pendingWithdrawals() {
        return ResponseEntity.ok(withdrawalService.getPendingReviewWithdrawals());
    }

    @PutMapping("/api/finance/withdrawals/{id}/review")
    @Operation(summary = "[ADMIN] Valider ou rejeter un retrait (anti-fraude CDC §8.2)")
    public ResponseEntity<WithdrawalResponse> reviewWithdrawal(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication authentication
    ) {
        Long adminId = ((com.retrouvit.entity.User) authentication.getPrincipal()).getId();
        boolean approve = Boolean.TRUE.equals(body.get("approve"));
        String note = body.get("note") != null ? String.valueOf(body.get("note")) : null;
        return ResponseEntity.ok(withdrawalService.reviewWithdrawal(id, adminId, approve, note));
    }

    @PostMapping("/api/finance/reconcile")
    @Operation(summary = "[ADMIN] Lancer la réconciliation manuelle")
    public ResponseEntity<Map<String, Object>> reconcileManually() {
        int corrected = reconciliationService.reconcilePendingWithdrawals();
        return ResponseEntity.ok(Map.of("corrected", corrected));
    }
}
