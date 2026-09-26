package com.retrouvit.controller;

import com.retrouvit.dto.LocationShareResponse;
import com.retrouvit.dto.RatingResponse;
import com.retrouvit.dto.ReturnRequestResponse;
import com.retrouvit.entity.User;
import com.retrouvit.service.LocationSharingService;
import com.retrouvit.service.PropertyVerificationService;
import com.retrouvit.service.ReturnRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Flow de restitution officiel — machine d'états §25 :
 * MATCH_FOUND → VERIFICATION_PENDING → VERIFIED → CONNECTION_PENDING →
 * CHAT_ACTIVE → PROPOSAL_PENDING → PAYMENT_PENDING → ESCROW_FUNDED →
 * MISSION_READY → MISSION_STARTED → MEETING_IN_PROGRESS → HANDOVER_PENDING → COMPLETED
 */
@RestController
@RequestMapping("/api/returns")
@RequiredArgsConstructor
@Tag(name = "Restitution", description = "Flow officiel de restitution — machine d'états §25")
public class ReturnRequestController {

    private final ReturnRequestService returnRequestService;
    private final PropertyVerificationService propertyVerificationService;
    private final LocationSharingService locationSharingService;

    // ─── §1-3 : Création de la collaboration ─────────────────

    @PostMapping
    @Operation(summary = "Initier une collaboration de restitution (MATCH_FOUND)")
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

    // ─── §2 : Vérification de propriété ──────────────────────

    @PostMapping("/{id}/verify-ownership")
    @Operation(summary = "Vérifier la propriété via la question secrète (§2)",
            description = "La réponse est comparée au hachage bcrypt. 5 échecs max — la correspondance est bloquée ensuite.")
    public ResponseEntity<ReturnRequestResponse> verifyOwnership(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        propertyVerificationService.verifyOwnership(id, user.getId(), request.get("answer"));
        // Recharge la collaboration mise à jour (statut VERIFIED)
        return ResponseEntity.ok(returnRequestService.getById(id, user.getId()));
    }

    // ─── §3-4 : Demande de mise en relation ──────────────────

    @PostMapping("/{id}/request-connection")
    @Operation(summary = "Demander la mise en relation (§3, Chercheur, après vérification)")
    public ResponseEntity<ReturnRequestResponse> requestConnection(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.requestConnection(id, user.getId()));
    }

    @PostMapping("/{id}/accept-connection")
    @Operation(summary = "Accepter la mise en relation (§4, Finder) → CHAT_ACTIVE")
    public ResponseEntity<ReturnRequestResponse> acceptConnection(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.acceptConnection(id, user.getId()));
    }

    @PostMapping("/{id}/reject-connection")
    @Operation(summary = "Refuser la mise en relation (§4, Finder) → REJECTED")
    public ResponseEntity<ReturnRequestResponse> rejectConnection(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.rejectConnection(id, user.getId()));
    }

    // ─── §6-8 : Proposition (Finder) et réponse (Chercheur) ──

    @PostMapping("/{id}/propose")
    @Operation(summary = "Proposer les conditions de restitution (§6, Finder) : montant + date + heure + lieu",
            description = "Une seule action : le Finder propose récompense, date/heure de rendez-vous et lieu.")
    public ResponseEntity<ReturnRequestResponse> proposeReturn(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        Long amount = request.get("amount") != null ? Long.valueOf(request.get("amount").toString()) : null;
        LocalDateTime meetingDate = request.get("meetingDate") != null
                ? LocalDateTime.parse(request.get("meetingDate").toString()) : null;
        String location = request.get("location") != null ? request.get("location").toString() : null;
        Double lat = request.get("lat") != null ? Double.valueOf(request.get("lat").toString()) : null;
        Double lng = request.get("lng") != null ? Double.valueOf(request.get("lng").toString()) : null;

        return ResponseEntity.ok(returnRequestService.proposeReturn(
                id, user.getId(), amount, meetingDate, location, lat, lng));
    }

    @PostMapping("/{id}/accept-proposal")
    @Operation(summary = "Accepter la proposition (§7, Chercheur) → PAYMENT_PENDING")
    public ResponseEntity<ReturnRequestResponse> acceptProposal(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.acceptProposal(id, user.getId()));
    }

    @PostMapping("/{id}/counter-proposal")
    @Operation(summary = "Modifier la proposition (§8, Chercheur) — contre-montant")
    public ResponseEntity<ReturnRequestResponse> counterProposal(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        Long newAmount = request.get("amount") != null ? Long.valueOf(request.get("amount").toString()) : null;
        return ResponseEntity.ok(returnRequestService.counterProposal(id, user.getId(), newAmount));
    }

    @PostMapping("/{id}/reject-proposal")
    @Operation(summary = "Refuser la proposition (§8, Chercheur) → retour à la discussion")
    public ResponseEntity<ReturnRequestResponse> rejectProposal(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.rejectProposal(id, user.getId()));
    }

    // ─── §9-10 : Paiement en séquestre ───────────────────────

    @PostMapping("/{id}/pay")
    @Operation(summary = "Payer et sécuriser la restitution (§9, Chercheur) → ESCROW_FUNDED",
            description = "Fonds débités et placés en séquestre. Idempotent.")
    public ResponseEntity<ReturnRequestResponse> payReward(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.payReward(id, user.getId()));
    }

    // ─── §11-14 : Mission ────────────────────────────────────

    @PostMapping("/{id}/start-mission")
    @Operation(summary = "Commencer la mission (§11, Chercheur) → MISSION_STARTED",
            description = "Transition unique — le Finder est informé automatiquement (§12), aucune seconde validation.")
    public ResponseEntity<ReturnRequestResponse> startMission(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.startMission(id, user.getId()));
    }

    @PostMapping("/{id}/arrived")
    @Operation(summary = "Je suis arrivé au rendez-vous (§14, Finder) → MEETING_IN_PROGRESS")
    public ResponseEntity<ReturnRequestResponse> markArrival(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.markArrival(id, user.getId()));
    }

    // ─── §15-19 : Double confirmation + libération auto ──────

    @PostMapping("/{id}/confirm-handover")
    @Operation(summary = "Confirmer la remise/réception (§16-18)",
            description = "Le Finder confirme la remise, le Chercheur confirme la réception. Les deux confirmations déclenchent la libération AUTOMATIQUE des fonds (§19).")
    public ResponseEntity<ReturnRequestResponse> confirmHandover(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.confirmHandover(id, user.getId()));
    }

    // ─── §13/§20 : Partage de position (mission uniquement) ──

    @PostMapping("/{id}/location")
    @Operation(summary = "Partager ma position (§13, parties uniquement)",
            description = "Position enregistrée uniquement pendant la mission (MISSION_STARTED → HANDOVER_PENDING). "
                    + "Purge automatique à la fin de la collaboration (§20).")
    public ResponseEntity<LocationShareResponse> updateLocation(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        Double lat = request.get("latitude") != null ? Double.valueOf(request.get("latitude").toString()) : null;
        Double lng = request.get("longitude") != null ? Double.valueOf(request.get("longitude").toString()) : null;
        Double accuracy = request.get("accuracyMeters") != null
                ? Double.valueOf(request.get("accuracyMeters").toString()) : null;
        return ResponseEntity.ok(locationSharingService.updateMyLocation(id, user.getId(), lat, lng, accuracy));
    }

    @GetMapping("/{id}/location/peer")
    @Operation(summary = "Position de l'autre partie (§13)",
            description = "Position masquée (sharingActive=false) hors de la fenêtre de mission.")
    public ResponseEntity<LocationShareResponse> getPeerLocation(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(locationSharingService.getPeerLocation(id, user.getId()));
    }

    @GetMapping("/{id}/location/me")
    @Operation(summary = "Ma dernière position partagée (§13)")
    public ResponseEntity<LocationShareResponse> getMyLocation(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(locationSharingService.getMyLocation(id, user.getId()));
    }

    // ─── §22-23 : Litiges ────────────────────────────────────

    @PostMapping("/{id}/dispute")
    @Operation(summary = "Signaler un problème (§22)")
    public ResponseEntity<ReturnRequestResponse> fileDispute(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.fileDispute(id, user.getId(), request.get("reason")));
    }

    @PostMapping("/{id}/resolve-dispute")
    @Operation(summary = "Trancher un litige (§23, admin)",
            description = "refundForLoser=true → remboursement Chercheur ; refundForLoser=false → déblocage fonds Finder.")
    public ResponseEntity<ReturnRequestResponse> resolveDispute(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request
    ) {
        String resolution = (String) request.get("resolution");
        Boolean refundForLoser = request.get("refundForLoser") != null
                ? Boolean.valueOf(request.get("refundForLoser").toString()) : null;
        return ResponseEntity.ok(returnRequestService.resolveDispute(id, resolution, refundForLoser));
    }

    // ─── §21 : Évaluation ────────────────────────────────────

    @PostMapping("/{id}/rate")
    @Operation(summary = "Évaluer la restitution (§21, après COMPLETED)")
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
    @Operation(summary = "Obtenir les notes reçues par un utilisateur")
    public ResponseEntity<List<RatingResponse>> getRatings(@PathVariable Long id) {
        return ResponseEntity.ok(returnRequestService.getRatingsForUser(id));
    }

    // ─── §24 : Timeline d'audit ──────────────────────────────

    @GetMapping("/{id}/timeline")
    @Operation(summary = "Timeline chronologique de la collaboration (§24)")
    public ResponseEntity<List<Map<String, Object>>> getTimeline(@PathVariable Long id) {
        return ResponseEntity.ok(returnRequestService.getTimeline(id));
    }

    // ─── Queries ─────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "Mes collaborations de restitution")
    public ResponseEntity<List<ReturnRequestResponse>> getMyReturns(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.getMyReturns(user.getId()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'une collaboration")
    public ResponseEntity<ReturnRequestResponse> getById(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(returnRequestService.getById(id, user.getId()));
    }
}
