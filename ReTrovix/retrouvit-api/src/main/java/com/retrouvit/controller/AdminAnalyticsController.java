package com.retrouvit.controller;

import com.retrouvit.service.AdminStatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
@Tag(name = "Admin Analytics", description = "API admin pour les analytics détaillés")
public class AdminAnalyticsController {

    private final AdminStatsService adminStatsService;

    @GetMapping
    @Operation(summary = "Obtenir les analytics détaillés")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        return ResponseEntity.ok(adminStatsService.getStats());
    }

    @GetMapping("/overview")
    @Operation(summary = "Vue d'ensemble de la plateforme")
    public ResponseEntity<Map<String, Object>> getOverview() {
        return ResponseEntity.ok(adminStatsService.getStats());
    }
}
