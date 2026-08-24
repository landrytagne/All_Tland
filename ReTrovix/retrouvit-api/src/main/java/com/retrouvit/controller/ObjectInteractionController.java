package com.retrouvit.controller;

import com.retrouvit.dto.CommentRequest;
import com.retrouvit.dto.CommentResponse;
import com.retrouvit.dto.InteractionResponse;
import com.retrouvit.entity.User;
import com.retrouvit.service.ObjectInteractionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interactions")
@RequiredArgsConstructor
@Tag(name = "Interactions", description = "Likes et commentaires sur les objets")
public class ObjectInteractionController {

    private final ObjectInteractionService interactionService;

    // ─── Likes ──────────────────────────────────────────────────────

    @GetMapping("/{objectType}/{objectId}")
    @Operation(summary = "Obtenir les interactions (likes, commentaires) d'un objet")
    public ResponseEntity<InteractionResponse> getInteractions(
            @PathVariable String objectType,
            @PathVariable Long objectId,
            Authentication authentication
    ) {
        Long userId = null;
        if (authentication != null) {
            User user = (User) authentication.getPrincipal();
            userId = user.getId();
        }
        return ResponseEntity.ok(interactionService.getInteractions(userId, objectType, objectId));
    }

    @PostMapping("/{objectType}/{objectId}/like")
    @Operation(summary = "Like / Unlike un objet")
    public ResponseEntity<InteractionResponse> toggleLike(
            @PathVariable String objectType,
            @PathVariable Long objectId,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(interactionService.toggleLike(user.getId(), objectType, objectId));
    }

    // ─── Comments ───────────────────────────────────────────────────

    @GetMapping("/{objectType}/{objectId}/comments")
    @Operation(summary = "Lister les commentaires d'un objet")
    public ResponseEntity<List<CommentResponse>> getComments(
            @PathVariable String objectType,
            @PathVariable Long objectId
    ) {
        return ResponseEntity.ok(interactionService.getComments(objectType, objectId));
    }

    @PostMapping("/{objectType}/{objectId}/comments")
    @Operation(summary = "Ajouter un commentaire")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable String objectType,
            @PathVariable Long objectId,
            @Valid @RequestBody CommentRequest request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();

        // Set IDs from path variables
        if ("lost".equals(objectType)) {
            request.setLostObjectId(objectId);
        } else {
            request.setFoundObjectId(objectId);
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(interactionService.addComment(user.getId(), request));
    }

    @DeleteMapping("/comments/{commentId}")
    @Operation(summary = "Supprimer un commentaire")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long commentId,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        interactionService.deleteComment(user.getId(), commentId);
        return ResponseEntity.noContent().build();
    }
}
