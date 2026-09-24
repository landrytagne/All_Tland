package com.retrouvit.controller;

import com.retrouvit.entity.Proof;
import com.retrouvit.entity.ReturnRequest;
import com.retrouvit.entity.User;
import com.retrouvit.service.ProofService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/returns/{returnId}/proofs")
@RequiredArgsConstructor
public class ProofController {

    private final ProofService proofService;

    /**
     * Soumettre des preuves pour un objet trouvé
     */
    @PostMapping
    public ResponseEntity<?> submitProof(
            @PathVariable Long returnId,
            @RequestBody ProofSubmitRequest request,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();

        Proof proof = Proof.builder()
                .description(request.getDescription())
                .characteristics(request.getCharacteristics())
                .condition(request.getCondition())
                .discoveryLocation(request.getDiscoveryLocation())
                .discoveryDateTime(request.getDiscoveryDateTime())
                .serialNumber(request.getSerialNumber())
                .technicalInfo(request.getTechnicalInfo())
                .photos(request.getPhotos())
                .build();

        Proof saved = proofService.submitProof(returnId, user.getId(), proof);
        return ResponseEntity.ok(saved);
    }

    /**
     * Récupérer les preuves d'une demande
     */
    @GetMapping
    public ResponseEntity<List<Proof>> getProofs(@PathVariable Long returnId) {
        return ResponseEntity.ok(proofService.getProofs(returnId));
    }

    /**
     * Demander plus d'informations au trouveur
     */
    @PostMapping("/request-more-info")
    public ResponseEntity<?> requestMoreInfo(
            @PathVariable Long returnId,
            @RequestBody RequestMoreInfoRequest request,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Proof updated = proofService.requestMoreInfo(returnId, user.getId(), request.getNote());
        return ResponseEntity.ok(updated);
    }

    /**
     * Confirmer la propriété (approuver les preuves)
     */
    @PostMapping("/confirm-ownership")
    public ResponseEntity<?> confirmOwnership(
            @PathVariable Long returnId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        ReturnRequest updated = proofService.confirmOwnership(returnId, user.getId());
        return ResponseEntity.ok(updated);
    }

    /**
     * Rejeter les preuves
     */
    @PostMapping("/reject")
    public ResponseEntity<?> rejectProof(
            @PathVariable Long returnId,
            @RequestBody RejectProofRequest request,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        ReturnRequest updated = proofService.rejectProof(returnId, user.getId(), request.getReason());
        return ResponseEntity.ok(updated);
    }

    // ════════════════════════════════════════════════════════════
    // Request DTOs
    // ════════════════════════════════════════════════════════════

    @Data
    public static class ProofSubmitRequest {
        private String description;
        private String characteristics;
        private String condition;
        private String discoveryLocation;
        private LocalDateTime discoveryDateTime;
        private String serialNumber;
        private String technicalInfo;
        private String photos;
    }

    @Data
    public static class RequestMoreInfoRequest {
        private String note;
    }

    @Data
    public static class RejectProofRequest {
        private String reason;
    }
}
