package com.retrouvit.controller;

import com.retrouvit.dto.*;
import com.retrouvit.entity.User;
import com.retrouvit.service.AdminService;
import com.retrouvit.service.AlertThresholdService;
import com.retrouvit.service.AdminPaymentService;
import com.retrouvit.service.ReturnRequestService;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Administration", description = "API d'administration (admin uniquement)")
public class AdminController {

    private final AdminService adminService;
    private final AlertThresholdService thresholdService;
    private final AdminPaymentService adminPaymentService;
    private final ReturnRequestService returnRequestService;

    @GetMapping("/users")
    @Operation(summary = "Lister tous les utilisateurs")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @GetMapping("/users/{id}")
    @Operation(summary = "Obtenir un utilisateur par ID")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getUserById(id));
    }

    @PutMapping("/users/{id}/ban")
    @Operation(summary = "Bannir un utilisateur")
    public ResponseEntity<UserResponse> banUser(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication
    ) {
        User admin = (User) authentication.getPrincipal();
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(adminService.banUser(id, reason, admin.getId()));
    }

    @PutMapping("/users/{id}/unban")
    @Operation(summary = "Débannir un utilisateur")
    public ResponseEntity<UserResponse> unbanUser(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User admin = (User) authentication.getPrincipal();
        return ResponseEntity.ok(adminService.unbanUser(id, admin.getId()));
    }

    @PutMapping("/users/{id}/verify")
    @Operation(summary = "Vérifier un utilisateur")
    public ResponseEntity<UserResponse> verifyUser(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User admin = (User) authentication.getPrincipal();
        return ResponseEntity.ok(adminService.verifyUser(id, admin.getId()));
    }

    @PutMapping("/users/{id}/unverify")
    @Operation(summary = "Retirer la vérification d'un utilisateur")
    public ResponseEntity<UserResponse> unverifyUser(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User admin = (User) authentication.getPrincipal();
        return ResponseEntity.ok(adminService.unverifyUser(id, admin.getId()));
    }

    @PutMapping("/users/{id}/role")
    @Operation(summary = "Changer le rôle d'un utilisateur")
    public ResponseEntity<UserResponse> changeRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {
        User admin = (User) authentication.getPrincipal();
        String role = body.get("role");
        return ResponseEntity.ok(adminService.changeRole(id, role, admin.getId()));
    }

    @DeleteMapping("/users/{id}")
    @Operation(summary = "Supprimer un utilisateur")
    public ResponseEntity<Void> deleteUser(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User admin = (User) authentication.getPrincipal();
        adminService.deleteUser(id, admin.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users/banned")
    @Operation(summary = "Lister les utilisateurs bannis")
    public ResponseEntity<List<UserResponse>> getBannedUsers() {
        return ResponseEntity.ok(adminService.getBannedUsers());
    }

    @GetMapping("/users/verified")
    @Operation(summary = "Lister les utilisateurs vérifiés")
    public ResponseEntity<List<UserResponse>> getVerifiedUsers() {
        return ResponseEntity.ok(adminService.getVerifiedUsers());
    }

    // ─── Alert Thresholds ──────────────────────────────────────────

    @GetMapping("/thresholds")
    @Operation(summary = "Lister tous les seuils d'alertes")
    public ResponseEntity<List<AlertThresholdResponse>> getAllThresholds() {
        return ResponseEntity.ok(thresholdService.getAll());
    }

    @GetMapping("/thresholds/{category}")
    @Operation(summary = "Obtenir les seuils d'une catégorie")
    public ResponseEntity<List<AlertThresholdResponse>> getThresholdsByCategory(@PathVariable String category) {
        return ResponseEntity.ok(thresholdService.getByCategory(category));
    }

    @PutMapping("/thresholds/{id}")
    @Operation(summary = "Modifier un seuil d'alerte")
    public ResponseEntity<AlertThresholdResponse> updateThreshold(
            @PathVariable Long id,
            @Valid @RequestBody AlertThresholdRequest request
    ) {
        return ResponseEntity.ok(thresholdService.update(id, request));
    }

    @PostMapping("/thresholds/reset")
    @Operation(summary = "Réinitialiser les seuils aux valeurs par défaut")
    public ResponseEntity<Map<String, Object>> resetThresholds() {
        return ResponseEntity.ok(thresholdService.resetDefaults());
    }

    // ─── Admin Payments ───────────────────────────────────────────

    @GetMapping("/payments")
    @Operation(summary = "Lister tous les paiements (admin)")
    public ResponseEntity<List<PaymentResponse>> getAllPayments() {
        return ResponseEntity.ok(adminPaymentService.getAllPayments());
    }

    @GetMapping("/payments/stats")
    @Operation(summary = "Statistiques globales des paiements (admin)")
    public ResponseEntity<Map<String, Object>> getPaymentStats() {
        return ResponseEntity.ok(adminPaymentService.getGlobalStats());
    }

    @GetMapping("/payments/search")
    @Operation(summary = "Rechercher des paiements (admin)")
    public ResponseEntity<List<PaymentResponse>> searchPayments(@RequestParam String q) {
        return ResponseEntity.ok(adminPaymentService.searchPayments(q));
    }

    // ─── Admin Disputes ───────────────────────────────────────────

    @GetMapping("/disputes")
    @Operation(summary = "Lister tous les litiges")
    public ResponseEntity<List<ReturnRequestResponse>> getAllDisputes() {
        return ResponseEntity.ok(returnRequestService.getAllDisputes());
    }

    @GetMapping("/disputes/stats")
    @Operation(summary = "Statistiques des litiges")
    public ResponseEntity<Map<String, Object>> getDisputeStats() {
        return ResponseEntity.ok(returnRequestService.getDisputeStats());
    }

    // ─── §24 : Vue administrateur des collaborations ─────────────

    @GetMapping("/collaborations")
    @Operation(summary = "Lister toutes les collaborations de restitution (§24)",
            description = "Filtrable par statut (?status=ESCROW_FUNDED).")
    public ResponseEntity<List<ReturnRequestResponse>> getAllCollaborations(
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(returnRequestService.getAllCollaborations(status));
    }

    @GetMapping("/collaborations/{id}")
    @Operation(summary = "Détail d'une collaboration avec tous les onglets d'audit (§24)",
            description = "Historique, Paiement (escrow), Messages, Preuves, Localisation.")
    public ResponseEntity<CollaborationAdminDetail> getCollaborationDetail(@PathVariable Long id) {
        return ResponseEntity.ok(returnRequestService.getCollaborationForAdmin(id));
    }

    @PostMapping("/disputes/{id}/resolve")
    @Operation(summary = "Résoudre un litige")
    public ResponseEntity<ReturnRequestResponse> resolveDispute(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request
    ) {
        String resolution = (String) request.get("resolution");
        Boolean refundForLoser = request.get("refundForLoser") != null
                ? Boolean.valueOf(request.get("refundForLoser").toString()) : null;
        return ResponseEntity.ok(returnRequestService.resolveDispute(id, resolution, refundForLoser));
    }
}
