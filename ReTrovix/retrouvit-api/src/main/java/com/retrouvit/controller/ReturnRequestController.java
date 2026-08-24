package com.retrouvit.controller;

import com.retrouvit.dto.RatingResponse;
import com.retrouvit.dto.ReturnRequestResponse;
import com.retrouvit.entity.User;
import com.retrouvit.service.ReturnRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/returns")
@RequiredArgsConstructor
@Tag(name = "Restitution", description = "API de gestion des retours d'objets perdus")
public class ReturnRequestController {

    private final ReturnRequestService returnRequestService;

    // ─── Initiate ────────────────────────────────────────────

    @PostMapping
    @Operation(summary = "Initier une demande de restitution")
    public ResponseEntity<ReturnRequestResponse> initiate(
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        Long loserId = Long.valueOf(request.get("loserId").toString());
        Long lostObjectId = request.get("lostObjectId") != null ? Long.valueOf(request.get("lostObjectId").toString()) : null;
        Long foundObjectId = request.get("foundObjectId") != null ? Long.valueOf(request.get("foundObjectId").toString()) : null;

        // Allow specifying finderId from request body; defaults to authenticated user
        Long finderId = request.get("finderId") != null ? Long.valueOf(request.get("finderId").toString()) : user.getId();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(returnRequestService.initiateReturn(finderId, loserId, lostObjectId, foundObjectId));
    }

    // ─── Reward ──────────────────────────────────────────────

    @PostMapping("/{id}/propose-reward")
    @Operation(summary = "Proposer une récompense (propriétaire)")
    public ResponseEntity<ReturnRequestResponse> proposeReward(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        Long amount = Long.valueOf(request.get("amount").toString());
        return ResponseEntity.ok(returnRequestService.proposeReward(id, user.getId(), amount));
    }

    @PostMapping("/{id}/accept-reward")
    @Operation(summary = "Accepter la récompense (retrouveur)")
    public ResponseEntity<ReturnRequestResponse> acceptReward(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        Long amount = Long.valueOf(request.get("amount").toString());
        return ResponseEntity.ok(returnRequestService.acceptReward(id, user.getId(), amount));
    }

    // ─── Validation ──────────────────────────────────────────

    @PostMapping("/{id}/validate")
    @Operation(summary = "Valider la collaboration")
    public ResponseEntity<ReturnRequestResponse> validateCollaboration(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.validateCollaboration(id, user.getId()));
    }

    // ─── Appointment ─────────────────────────────────────────

    @PostMapping("/{id}/set-appointment")
    @Operation(summary = "Fixer un rendez-vous")
    public ResponseEntity<ReturnRequestResponse> setAppointment(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        String dateStr = (String) request.get("meetingDate");
        LocalDateTime meetingDate = LocalDateTime.parse(dateStr);
        String location = (String) request.getOrDefault("meetingLocation", "");
        Double lat = request.get("meetingLat") != null ? Double.valueOf(request.get("meetingLat").toString()) : null;
        Double lng = request.get("meetingLng") != null ? Double.valueOf(request.get("meetingLng").toString()) : null;

        return ResponseEntity.ok(returnRequestService.setAppointment(id, user.getId(), meetingDate, location, lat, lng));
    }

    @PostMapping("/{id}/start-return")
    @Operation(summary = "Démarrer la restitution")
    public ResponseEntity<ReturnRequestResponse> startReturn(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.startReturn(id, user.getId()));
    }

    // ─── Return Confirmation ─────────────────────────────────

    @PostMapping("/{id}/confirm-return")
    @Operation(summary = "Confirmer la restitution")
    public ResponseEntity<ReturnRequestResponse> confirmReturn(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.confirmReturn(id, user.getId()));
    }

    // ─── Dispute ─────────────────────────────────────────────

    @PostMapping("/{id}/dispute")
    @Operation(summary = "Signaler un litige")
    public ResponseEntity<ReturnRequestResponse> fileDispute(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.fileDispute(id, user.getId(), request.get("reason")));
    }

    @PostMapping("/{id}/resolve-dispute")
    @Operation(summary = "Résoudre un litige (admin)")
    public ResponseEntity<ReturnRequestResponse> resolveDispute(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(returnRequestService.resolveDispute(id, request.get("resolution")));
    }

    // ─── Rating ──────────────────────────────────────────────

    @PostMapping("/{id}/rate")
    @Operation(summary = "Noter et commenter l'échange")
    public ResponseEntity<RatingResponse> rateUser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        Integer stars = (Integer) request.get("stars");
        String comment = (String) request.getOrDefault("comment", null);
        return ResponseEntity.ok(returnRequestService.rateUser(id, user.getId(), stars, comment));
    }

    @GetMapping("/{id}/ratings")
    @Operation(summary = "Obtenir les notes d'un utilisateur")
    public ResponseEntity<List<RatingResponse>> getRatings(@PathVariable Long id) {
        return ResponseEntity.ok(returnRequestService.getRatingsForUser(id));
    }

    // ─── Queries ─────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "Mes demandes de restitution")
    public ResponseEntity<List<ReturnRequestResponse>> getMyReturns(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.getMyReturns(user.getId()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'une demande de restitution")
    public ResponseEntity<ReturnRequestResponse> getById(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.getById(id, user.getId()));
    }
}
