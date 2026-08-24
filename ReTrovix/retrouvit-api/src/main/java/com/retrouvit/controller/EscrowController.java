package com.retrouvit.controller;

import com.retrouvit.dto.EscrowResponse;
import com.retrouvit.entity.User;
import com.retrouvit.service.EscrowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/escrows")
@RequiredArgsConstructor
@Tag(name = "Escrow / Séquestre", description = "API de gestion des escrows")
public class EscrowController {

    private final EscrowService escrowService;

    @GetMapping
    @Operation(summary = "Obtenir les escrows de l'utilisateur")
    public ResponseEntity<List<EscrowResponse>> getEscrows(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(escrowService.getEscrowsByUserId(user.getId()));
    }

    @PostMapping
    @Operation(summary = "Créer un escrow")
    public ResponseEntity<EscrowResponse> createEscrow(
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        Long sellerId = Long.valueOf(request.get("sellerId").toString());
        Long amount = Long.valueOf(request.get("amount").toString());
        String location = (String) request.getOrDefault("location", "");

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(escrowService.createEscrow(user.getId(), sellerId, amount, location));
    }

    @PutMapping("/{id}/confirm-return")
    @Operation(summary = "Confirmer le retour de l'objet")
    public ResponseEntity<EscrowResponse> confirmReturn(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(escrowService.confirmReturn(id, user.getId()));
    }

    @PutMapping("/{id}/complete")
    @Operation(summary = "Compléter l'escrow")
    public ResponseEntity<EscrowResponse> completeEscrow(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(escrowService.completeEscrow(id, user.getId()));
    }

    @PutMapping("/{id}/refund")
    @Operation(summary = "Rembourser l'escrow")
    public ResponseEntity<EscrowResponse> refundEscrow(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(escrowService.refundEscrow(id, user.getId()));
    }
}
