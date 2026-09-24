package com.retrouvit.controller;

import com.retrouvit.dto.PlatformSettingsResponse;
import com.retrouvit.service.PlatformSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@Tag(name = "Platform Settings", description = "API de paramètres de la plateforme")
public class PlatformSettingsController {

    private final PlatformSettingsService settingsService;

    @GetMapping
    @Operation(summary = "Lister tous les paramètres")
    public ResponseEntity<List<PlatformSettingsResponse>> getAllSettings() {
        return ResponseEntity.ok(settingsService.getAllSettings());
    }

    @GetMapping("/{key}")
    @Operation(summary = "Obtenir un paramètre par clé")
    public ResponseEntity<PlatformSettingsResponse> getSettingByKey(@PathVariable String key) {
        PlatformSettingsResponse setting = settingsService.getSettingByKey(key);
        if (setting == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(setting);
    }

    @PutMapping("/{key}")
    @Operation(summary = "Modifier un paramètre (admin)")
    public ResponseEntity<PlatformSettingsResponse> updateSetting(
            @PathVariable String key,
            @RequestBody Map<String, String> body
    ) {
        String value = body.get("value");
        return ResponseEntity.ok(settingsService.updateSetting(key, value));
    }

    @PutMapping
    @Operation(summary = "Modifier plusieurs paramètres (admin)")
    public ResponseEntity<List<PlatformSettingsResponse>> updateSettings(
            @RequestBody Map<String, String> settingsMap
    ) {
        return ResponseEntity.ok(settingsService.updateSettings(settingsMap));
    }

    @PostMapping("/initialize")
    @Operation(summary = "Initialiser les paramètres par défaut (admin)")
    public ResponseEntity<Map<String, String>> initializeDefaults() {
        settingsService.initializeDefaults();
        return ResponseEntity.ok(Map.of("message", "Paramètres initialisés avec succès"));
    }
}
