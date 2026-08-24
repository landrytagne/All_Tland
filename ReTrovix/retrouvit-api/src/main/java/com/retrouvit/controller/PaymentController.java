package com.retrouvit.controller;

import com.retrouvit.dto.PaymentRequest;
import com.retrouvit.dto.PaymentResponse;
import com.retrouvit.entity.User;
import com.retrouvit.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Tag(name = "Paiements", description = "API de gestion des paiements Mobile Money")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @Operation(summary = "Initier un paiement Mobile Money (MTN MoMo, Orange Money, Wave)")
    public ResponseEntity<PaymentResponse> initiatePayment(
            @Valid @RequestBody PaymentRequest request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        PaymentResponse payment = paymentService.initiatePayment(user.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(payment);
    }

    @GetMapping("/{reference}")
    @Operation(summary = "Vérifier le statut d'un paiement")
    public ResponseEntity<PaymentResponse> getPaymentStatus(
            @PathVariable String reference,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(paymentService.getPaymentStatus(user.getId(), reference));
    }

    @GetMapping
    @Operation(summary = "Obtenir l'historique des paiements")
    public ResponseEntity<List<PaymentResponse>> getPaymentHistory(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(paymentService.getPaymentHistory(user.getId()));
    }

    @GetMapping("/stats")
    @Operation(summary = "Obtenir les statistiques de paiement")
    public ResponseEntity<PaymentService.PaymentStats> getPaymentStats(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(paymentService.getPaymentStats(user.getId()));
    }
}
