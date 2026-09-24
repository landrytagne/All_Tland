package com.retrouvit.controller;

import com.retrouvit.dto.CityResponse;
import com.retrouvit.service.CityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cities")
@RequiredArgsConstructor
@Tag(name = "Cities", description = "API de gestion des villes")
public class CityController {

    private final CityService cityService;

    @GetMapping
    @Operation(summary = "Lister toutes les villes")
    public ResponseEntity<List<CityResponse>> getAllCities() {
        return ResponseEntity.ok(cityService.getAllCities());
    }

    @GetMapping("/enabled")
    @Operation(summary = "Lister les villes activées")
    public ResponseEntity<List<CityResponse>> getEnabledCities() {
        return ResponseEntity.ok(cityService.getEnabledCities());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir une ville par ID")
    public ResponseEntity<CityResponse> getCityById(@PathVariable Long id) {
        return ResponseEntity.ok(cityService.getCityById(id));
    }

    @PostMapping
    @Operation(summary = "Créer une ville (admin)")
    public ResponseEntity<CityResponse> createCity(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String region = body.get("region");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(cityService.createCity(name, region));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier une ville (admin)")
    public ResponseEntity<CityResponse> updateCity(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        String name = (String) body.get("name");
        String region = (String) body.get("region");
        Boolean enabled = body.get("enabled") != null ? (Boolean) body.get("enabled") : null;
        return ResponseEntity.ok(cityService.updateCity(id, name, region, enabled));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une ville (admin)")
    public ResponseEntity<Void> deleteCity(@PathVariable Long id) {
        cityService.deleteCity(id);
        return ResponseEntity.noContent().build();
    }
}
