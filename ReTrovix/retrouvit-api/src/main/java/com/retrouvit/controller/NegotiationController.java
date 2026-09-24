package com.retrouvit.controller;

import com.retrouvit.entity.NegotiationOffer;
import com.retrouvit.entity.ReturnRequest;
import com.retrouvit.entity.User;
import com.retrouvit.service.NegotiationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/returns/{returnId}/negotiate")
@RequiredArgsConstructor
public class NegotiationController {

    private final NegotiationService negotiationService;

    /**
     * Proposer un montant de récompense
     */
    @PostMapping("/propose")
    public ResponseEntity<?> propose(
            @PathVariable Long returnId,
            @RequestBody ProposeRequest request,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        NegotiationOffer offer = negotiationService.propose(
                returnId, user.getId(), request.getAmount(), request.getMessage());
        return ResponseEntity.ok(offer);
    }

    /**
     * Contre-proposer un montant
     */
    @PostMapping("/counter")
    public ResponseEntity<?> counterPropose(
            @PathVariable Long returnId,
            @RequestBody ProposeRequest request,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        NegotiationOffer offer = negotiationService.counterPropose(
                returnId, user.getId(), request.getAmount(), request.getMessage());
        return ResponseEntity.ok(offer);
    }

    /**
     * Accepter l'offre actuelle
     */
    @PostMapping("/accept")
    public ResponseEntity<?> accept(
            @PathVariable Long returnId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        ReturnRequest updated = negotiationService.acceptOffer(returnId, user.getId());
        return ResponseEntity.ok(updated);
    }

    /**
     * Refuser l'offre actuelle
     */
    @PostMapping("/reject")
    public ResponseEntity<?> reject(
            @PathVariable Long returnId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        ReturnRequest updated = negotiationService.rejectOffer(returnId, user.getId());
        return ResponseEntity.ok(updated);
    }

    /**
     * Récupérer l'historique des offres
     */
    @GetMapping
    public ResponseEntity<List<NegotiationOffer>> getHistory(@PathVariable Long returnId) {
        return ResponseEntity.ok(negotiationService.getOfferHistory(returnId));
    }

    // ════════════════════════════════════════════════════════════
    // Request DTOs
    // ════════════════════════════════════════════════════════════

    @Data
    public static class ProposeRequest {
        private Long amount;
        private String message;
    }
}
