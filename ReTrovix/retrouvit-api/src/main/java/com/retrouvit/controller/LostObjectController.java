package com.retrouvit.controller;

import com.retrouvit.dto.*;
import com.retrouvit.entity.User;
import com.retrouvit.service.LostObjectService;
import com.retrouvit.service.MatchingEngine;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lost-objects")
@RequiredArgsConstructor
@Tag(name = "Objets Perdus", description = "API de gestion des objets perdus")
public class LostObjectController {

    private final LostObjectService lostObjectService;
    private final MatchingEngine matchingEngine;

    @PostMapping
    @Operation(summary = "Créer une annonce d'objet perdu")
    public ResponseEntity<LostObjectResponse> create(
            @Valid @RequestBody LostObjectRequest request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        LostObjectResponse response = lostObjectService.create(request, user.getId());

        // Trigger matching for this new object
        matchingEngine.matchForObject(response.getId());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Lister tous les objets perdus actifs (paginé)")
    public ResponseEntity<PageResponse<LostObjectResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(lostObjectService.getAll(page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir un objet perdu par ID")
    public ResponseEntity<LostObjectResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(lostObjectService.getById(id));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Obtenir les objets perdus d'un utilisateur")
    public ResponseEntity<PageResponse<LostObjectResponse>> getByUserId(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(lostObjectService.getByUserId(userId, page, size));
    }

    @GetMapping("/category/{category}")
    @Operation(summary = "Obtenir les objets perdus par catégorie")
    public ResponseEntity<PageResponse<LostObjectResponse>> getByCategory(
            @PathVariable String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(lostObjectService.getByCategory(category, page, size));
    }

    @GetMapping("/city/{city}")
    @Operation(summary = "Obtenir les objets perdus par ville")
    public ResponseEntity<PageResponse<LostObjectResponse>> getByCity(
            @PathVariable String city,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(lostObjectService.getByCity(city, page, size));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour un objet perdu")
    public ResponseEntity<LostObjectResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody LostObjectRequest request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        LostObjectResponse response = lostObjectService.update(id, request, user.getId());
        // Modification significative (photo, description) → recalcul (CDC §7.2)
        matchingEngine.matchForObject(response.getId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un objet perdu")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        lostObjectService.delete(id, user.getId());
        return ResponseEntity.noContent().build();
    }
}
