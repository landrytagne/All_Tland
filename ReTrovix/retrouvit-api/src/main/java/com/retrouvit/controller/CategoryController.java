package com.retrouvit.controller;

import com.retrouvit.dto.CategoryResponse;
import com.retrouvit.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "API de gestion des catégories")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    @Operation(summary = "Lister toutes les catégories")
    public ResponseEntity<List<CategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    @GetMapping("/enabled")
    @Operation(summary = "Lister les catégories activées")
    public ResponseEntity<List<CategoryResponse>> getEnabledCategories() {
        return ResponseEntity.ok(categoryService.getEnabledCategories());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir une catégorie par ID")
    public ResponseEntity<CategoryResponse> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.getCategoryById(id));
    }

    @PostMapping
    @Operation(summary = "Créer une catégorie (admin)")
    public ResponseEntity<CategoryResponse> createCategory(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String icon = body.get("icon");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.createCategory(name, icon));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier une catégorie (admin)")
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        String name = (String) body.get("name");
        String icon = (String) body.get("icon");
        Boolean enabled = body.get("enabled") != null ? (Boolean) body.get("enabled") : null;
        return ResponseEntity.ok(categoryService.updateCategory(id, name, icon, enabled));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une catégorie (admin)")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
