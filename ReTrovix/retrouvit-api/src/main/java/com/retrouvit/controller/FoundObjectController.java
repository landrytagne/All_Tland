package com.retrouvit.controller;

import com.retrouvit.dto.*;
import com.retrouvit.entity.User;
import com.retrouvit.service.FoundObjectService;
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
@RequestMapping("/api/found-objects")
@RequiredArgsConstructor
@Tag(name = "Objets Trouvés", description = "API de gestion des objets trouvés")
public class FoundObjectController {

    private final FoundObjectService foundObjectService;
    private final MatchingEngine matchingEngine;

    @PostMapping
    @Operation(summary = "Créer une annonce d'objet trouvé")
    public ResponseEntity<FoundObjectResponse> create(
            @Valid @RequestBody FoundObjectRequest request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        FoundObjectResponse response = foundObjectService.create(request, user.getId());
        // Recalcul du matching à la création (CDC §7.2) — sens found → lost
        matchingEngine.matchForFoundObject(response.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Lister tous les objets trouvés actifs (paginé)")
    public ResponseEntity<PageResponse<FoundObjectResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(foundObjectService.getAll(page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir un objet trouvé par ID")
    public ResponseEntity<FoundObjectResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(foundObjectService.getById(id));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Obtenir les objets trouvés d'un utilisateur")
    public ResponseEntity<PageResponse<FoundObjectResponse>> getByUserId(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(foundObjectService.getByUserId(userId, page, size));
    }

    @GetMapping("/category/{category}")
    @Operation(summary = "Obtenir les objets trouvés par catégorie")
    public ResponseEntity<PageResponse<FoundObjectResponse>> getByCategory(
            @PathVariable String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(foundObjectService.getByCategory(category, page, size));
    }

    @GetMapping("/city/{city}")
    @Operation(summary = "Obtenir les objets trouvés par ville")
    public ResponseEntity<PageResponse<FoundObjectResponse>> getByCity(
            @PathVariable String city,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(foundObjectService.getByCity(city, page, size));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour un objet trouvé")
    public ResponseEntity<FoundObjectResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody FoundObjectRequest request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        FoundObjectResponse response = foundObjectService.update(id, request, user.getId());
        // Modification significative (photo, description) → recalcul (CDC §7.2)
        matchingEngine.matchForFoundObject(response.getId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un objet trouvé")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        foundObjectService.delete(id, user.getId());
        return ResponseEntity.noContent().build();
    }
}
