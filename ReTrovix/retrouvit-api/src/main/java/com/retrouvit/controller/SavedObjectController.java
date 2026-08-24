package com.retrouvit.controller;

import com.retrouvit.entity.User;
import com.retrouvit.service.SavedObjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/saved")
@RequiredArgsConstructor
@Tag(name = "Sauvegardes", description = "Enregistrer des annonces en favoris")
public class SavedObjectController {

    private final SavedObjectService savedObjectService;

    @GetMapping("/{objectType}/{objectId}")
    @Operation(summary = "Vérifier si un objet est sauvegardé")
    public ResponseEntity<Map<String, Object>> getStatus(
            @PathVariable String objectType,
            @PathVariable Long objectId,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(savedObjectService.getStatus(user.getId(), objectType, objectId));
    }

    @PostMapping("/{objectType}/{objectId}/toggle")
    @Operation(summary = "Sauvegarder / Désauvegarder un objet")
    public ResponseEntity<Map<String, Object>> toggle(
            @PathVariable String objectType,
            @PathVariable Long objectId,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(savedObjectService.toggle(user.getId(), objectType, objectId));
    }

    @GetMapping("/count")
    @Operation(summary = "Nombre d'objets sauvegardés")
    public ResponseEntity<Map<String, Integer>> getCount(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(Map.of("count", savedObjectService.getCount(user.getId())));
    }
}
