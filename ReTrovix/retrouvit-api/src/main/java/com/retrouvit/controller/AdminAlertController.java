package com.retrouvit.controller;

import com.retrouvit.dto.AdminAlertResponse;
import com.retrouvit.service.AdminAlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/alerts")
@RequiredArgsConstructor
@Tag(name = "Admin Alerts", description = "Alertes automatiques admin")
public class AdminAlertController {

    private final AdminAlertService alertService;

    @GetMapping
    @Operation(summary = "Récupérer les alertes actives")
    public ResponseEntity<List<AdminAlertResponse>> getActiveAlerts() {
        return ResponseEntity.ok(alertService.getActiveAlerts());
    }

    @GetMapping("/all")
    @Operation(summary = "Récupérer toutes les alertes")
    public ResponseEntity<List<AdminAlertResponse>> getAllAlerts() {
        return ResponseEntity.ok(alertService.getAllAlerts());
    }

    @GetMapping("/stats")
    @Operation(summary = "Statistiques des alertes")
    public ResponseEntity<Map<String, Long>> getAlertStats() {
        return ResponseEntity.ok(alertService.getAlertStats());
    }

    @PutMapping("/{id}/acknowledge")
    @Operation(summary = "Acquitter une alerte")
    public ResponseEntity<AdminAlertResponse> acknowledgeAlert(@PathVariable Long id) {
        return ResponseEntity.ok(alertService.acknowledgeAlert(id));
    }
}
