package com.retrouvit.controller;

import com.retrouvit.dto.CertificationRequestDTO;
import com.retrouvit.dto.CertificationResponseDTO;
import com.retrouvit.entity.CertificationStatus;
import com.retrouvit.entity.User;
import com.retrouvit.service.CertificationService;
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
@RequestMapping("/api/certification")
@RequiredArgsConstructor
@Tag(name = "Certification", description = "API de certification d'utilisateurs")
public class CertificationController {

    private final CertificationService certificationService;

    @PostMapping("/request")
    @Operation(summary = "Soumettre une demande de certification")
    public ResponseEntity<CertificationResponseDTO> submitRequest(
            @Valid @RequestBody CertificationRequestDTO request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(certificationService.submitRequest(user.getId(), request));
    }

    @GetMapping("/my-requests")
    @Operation(summary = "Voir mes demandes de certification")
    public ResponseEntity<List<CertificationResponseDTO>> getMyRequests(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(certificationService.getMyRequests(user.getId()));
    }

    @GetMapping("/my-latest")
    @Operation(summary = "Voir ma dernière demande de certification")
    public ResponseEntity<CertificationResponseDTO> getMyLatestRequest(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        CertificationResponseDTO latest = certificationService.getMyLatestRequest(user.getId());
        return ResponseEntity.ok(latest);
    }

    @PostMapping("/cancel/{id}")
    @Operation(summary = "Annuler une demande de certification en attente")
    public ResponseEntity<CertificationResponseDTO> cancelRequest(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(certificationService.cancelRequest(id, user.getId()));
    }

    @GetMapping("/eligibility")
    @Operation(summary = "Vérifier l'éligibilité à la certification")
    public ResponseEntity<Map<String, Object>> checkEligibility(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(certificationService.checkEligibility(user.getId()));
    }

    // ─── Admin endpoints ──────────────────────────────────────

    @GetMapping("/admin/pending")
    @Operation(summary = "Lister les demandes en attente (admin)")
    public ResponseEntity<List<CertificationResponseDTO>> getPendingRequests() {
        return ResponseEntity.ok(certificationService.getAllPendingRequests());
    }

    @GetMapping("/admin/all")
    @Operation(summary = "Lister toutes les demandes (admin)")
    public ResponseEntity<List<CertificationResponseDTO>> getAllRequests() {
        return ResponseEntity.ok(certificationService.getAllRequests());
    }

    @GetMapping("/admin/status/{status}")
    @Operation(summary = "Lister les demandes par statut (admin)")
    public ResponseEntity<List<CertificationResponseDTO>> getRequestsByStatus(
            @PathVariable CertificationStatus status
    ) {
        return ResponseEntity.ok(certificationService.getRequestsByStatus(status));
    }

    @PostMapping("/admin/{id}/approve")
    @Operation(summary = "Approuver une demande de certification (admin)")
    public ResponseEntity<CertificationResponseDTO> approveRequest(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication
    ) {
        User admin = (User) authentication.getPrincipal();
        String adminNotes = body != null ? body.get("notes") : null;
        return ResponseEntity.ok(certificationService.approveRequest(id, admin.getId(), adminNotes));
    }

    @PostMapping("/admin/{id}/suspend")
    @Operation(summary = "Suspendre une demande de certification (admin)")
    public ResponseEntity<CertificationResponseDTO> suspendRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {
        User admin = (User) authentication.getPrincipal();
        String reason = body.get("reason");
        String adminNotes = body.get("notes");
        return ResponseEntity.ok(certificationService.suspendRequest(id, admin.getId(), reason, adminNotes));
    }

    @PostMapping("/admin/{id}/reject")
    @Operation(summary = "Refuser une demande de certification (admin)")
    public ResponseEntity<CertificationResponseDTO> rejectRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {
        User admin = (User) authentication.getPrincipal();
        String rejectionReason = body.get("reason");
        String adminNotes = body.get("notes");
        return ResponseEntity.ok(certificationService.rejectRequest(id, admin.getId(), rejectionReason, adminNotes));
    }

    @GetMapping("/admin/pending/count")
    @Operation(summary = "Nombre de demandes en attente (admin)")
    public ResponseEntity<Map<String, Long>> getPendingCount() {
        return ResponseEntity.ok(Map.of("count", certificationService.getPendingCount()));
    }

    @GetMapping("/admin/stats")
    @Operation(summary = "Statistiques des certifications (admin)")
    public ResponseEntity<Map<String, Object>> getCertificationStats() {
        return ResponseEntity.ok(certificationService.getCertificationStats());
    }
}
