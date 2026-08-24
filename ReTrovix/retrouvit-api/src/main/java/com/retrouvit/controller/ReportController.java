package com.retrouvit.controller;

import com.retrouvit.dto.ReportRequest;
import com.retrouvit.dto.ReportResponse;
import com.retrouvit.entity.ReportStatus;
import com.retrouvit.entity.ReportType;
import com.retrouvit.entity.User;
import com.retrouvit.service.ReportService;
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
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Signalements", description = "API de gestion des réclamations et signalements")
public class ReportController {

    private final ReportService reportService;

    // ─── User endpoints ──────────────────────────────────────────────

    @PostMapping
    @Operation(summary = "Créer un signalement")
    public ResponseEntity<ReportResponse> createReport(
            @Valid @RequestBody ReportRequest request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reportService.createReport(user.getId(), request));
    }

    @GetMapping("/my")
    @Operation(summary = "Mes signalements envoyés")
    public ResponseEntity<List<ReportResponse>> getMyReports(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(reportService.getReportsByReporter(user.getId()));
    }

    // ─── Admin endpoints ─────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "Lister tous les signalements (admin)")
    public ResponseEntity<List<ReportResponse>> getAllReports() {
        return ResponseEntity.ok(reportService.getAllReports());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir un signalement par ID (admin)")
    public ResponseEntity<ReportResponse> getReportById(@PathVariable Long id) {
        return ResponseEntity.ok(reportService.getReportById(id));
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Filtrer par statut (admin)")
    public ResponseEntity<List<ReportResponse>> getByStatus(@PathVariable String status) {
        return ResponseEntity.ok(reportService.getReportsByStatus(ReportStatus.valueOf(status.toUpperCase())));
    }

    @GetMapping("/type/{type}")
    @Operation(summary = "Filtrer par type (admin)")
    public ResponseEntity<List<ReportResponse>> getByType(@PathVariable String type) {
        return ResponseEntity.ok(reportService.getReportsByType(ReportType.valueOf(type.toUpperCase())));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Signalements d'un utilisateur (admin)")
    public ResponseEntity<List<ReportResponse>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(reportService.getReportsByReported(userId));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Mettre à jour le statut (admin)")
    public ResponseEntity<ReportResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {
        User admin = (User) authentication.getPrincipal();
        ReportStatus status = ReportStatus.valueOf(body.get("status").toUpperCase());
        return ResponseEntity.ok(reportService.updateStatus(id, status, admin.getId()));
    }

    @PutMapping("/{id}/resolve")
    @Operation(summary = "Résoudre un signalement (admin)")
    public ResponseEntity<ReportResponse> resolveReport(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {
        User admin = (User) authentication.getPrincipal();
        return ResponseEntity.ok(reportService.resolveReport(id, body.get("resolution"), admin.getId()));
    }

    @PutMapping("/{id}/escalate")
    @Operation(summary = "Escalader un signalement (admin)")
    public ResponseEntity<ReportResponse> escalateReport(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User admin = (User) authentication.getPrincipal();
        return ResponseEntity.ok(reportService.escalateReport(id, admin.getId()));
    }

    @PutMapping("/{id}/dismiss")
    @Operation(summary = "Rejeter un signalement (admin)")
    public ResponseEntity<ReportResponse> dismissReport(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {
        User admin = (User) authentication.getPrincipal();
        return ResponseEntity.ok(reportService.dismissReport(id, body.get("reason"), admin.getId()));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un signalement (admin)")
    public ResponseEntity<Void> deleteReport(@PathVariable Long id) {
        reportService.deleteReport(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    @Operation(summary = "Statistiques des signalements (admin)")
    public ResponseEntity<Map<String, Long>> getStats() {
        return ResponseEntity.ok(Map.of(
                "total", reportService.getCountByStatus(ReportStatus.PENDING) +
                        reportService.getCountByStatus(ReportStatus.IN_REVIEW) +
                        reportService.getCountByStatus(ReportStatus.RESOLVED) +
                        reportService.getCountByStatus(ReportStatus.DISMISSED) +
                        reportService.getCountByStatus(ReportStatus.ESCALATED),
                "pending", reportService.getCountByStatus(ReportStatus.PENDING),
                "in_review", reportService.getCountByStatus(ReportStatus.IN_REVIEW),
                "resolved", reportService.getCountByStatus(ReportStatus.RESOLVED),
                "dismissed", reportService.getCountByStatus(ReportStatus.DISMISSED),
                "escalated", reportService.getCountByStatus(ReportStatus.ESCALATED)
        ));
    }
}
