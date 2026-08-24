package com.retrouvit.controller;

import com.retrouvit.dto.TransactionResponse;
import com.retrouvit.entity.TransactionType;
import com.retrouvit.entity.User;
import com.retrouvit.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
@Tag(name = "Portefeuille", description = "API de gestion du portefeuille et transactions")
public class WalletController {

    private final TransactionService transactionService;

    @GetMapping("/balance")
    @Operation(summary = "Obtenir le solde du portefeuille")
    public ResponseEntity<Map<String, Long>> getBalance(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long balance = transactionService.getBalance(user.getId());
        return ResponseEntity.ok(Map.of("balance", balance));
    }

    @GetMapping("/transactions")
    @Operation(summary = "Obtenir l'historique des transactions")
    public ResponseEntity<List<TransactionResponse>> getTransactions(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(transactionService.getTransactions(user.getId()));
    }

    @PostMapping("/deposit")
    @Operation(summary = "Déposer des fonds")
    public ResponseEntity<Map<String, String>> deposit(
            @RequestBody Map<String, Long> request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        Long amount = request.get("amount");
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Le montant doit être positif");
        }
        transactionService.deposit(user.getId(), amount);
        transactionService.createTransaction(user.getId(), TransactionType.DEPOSIT, amount, "Dépôt de fonds");
        return ResponseEntity.ok(Map.of("message", "Dépôt effectué avec succès"));
    }
}
