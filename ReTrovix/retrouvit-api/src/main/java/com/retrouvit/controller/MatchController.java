package com.retrouvit.controller;

import com.retrouvit.dto.MatchResponse;
import com.retrouvit.entity.MatchStatus;
import com.retrouvit.entity.User;
import com.retrouvit.service.MatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
@Tag(name = "Correspondances", description = "API de gestion des correspondances")
public class MatchController {

    private final MatchService matchService;

    @GetMapping
    @Operation(summary = "Obtenir les matches de l'utilisateur connecté")
    public ResponseEntity<List<MatchResponse>> getMyMatches(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(matchService.getMatchesByUserId(user.getId()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir un match par ID")
    public ResponseEntity<List<MatchResponse>> getMatchById(@PathVariable Long id, Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(matchService.getMatchesByUserId(id));
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Obtenir les matches par statut")
    public ResponseEntity<List<MatchResponse>> getMatchesByStatus(
            @PathVariable String status,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        MatchStatus matchStatus = MatchStatus.valueOf(status.toUpperCase());
        return ResponseEntity.ok(matchService.getMatchesByUserIdAndStatus(user.getId(), matchStatus));
    }

    @PutMapping("/{id}/confirm")
    @Operation(summary = "Confirmer un match")
    public ResponseEntity<MatchResponse> confirmMatch(@PathVariable Long id, Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(matchService.updateStatus(id, MatchStatus.CONFIRMED, user.getId()));
    }

    @PutMapping("/{id}/reject")
    @Operation(summary = "Rejeter un match")
    public ResponseEntity<MatchResponse> rejectMatch(@PathVariable Long id, Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(matchService.updateStatus(id, MatchStatus.REJECTED, user.getId()));
    }
}
