package com.retrouvit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Détail complet d'une collaboration pour la vue administrateur (§24).
 *
 * Regroupe les onglets du back-office :
 * Historique (timeline) | Paiement (escrow) | Messages | Preuves | Localisation.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollaborationAdminDetail {

    private ReturnRequestResponse collaboration;

    /** Onglet « Historique » — timeline d'audit complète. */
    private List<TimelineEntry> timeline;

    /** Onglet « Paiement » — séquestre lié à la collaboration (null si pas encore créé). */
    private EscrowInfo escrow;

    /** Onglet « Messages » — conversation liée (§5 : conservée pour arbitrage litige). */
    private List<ChatMessage> messages;

    /** Onglet « Preuves » — preuves de propriété soumises par le Finder. */
    private List<ProofInfo> proofs;

    /** Onglet « Localisation » — positions partagées pendant la mission (§13). */
    private List<LiveLocation> locations;

    // ─── Structures internes ─────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TimelineEntry {
        private Long id;
        private String eventType;
        private String description;
        private String actorName;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EscrowInfo {
        private Long id;
        private String reference;
        private Long amount;
        private String status;
        private Integer progress;
        private String location;
        private LocalDateTime deadline;
        private LocalDateTime completedAt;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChatMessage {
        private Long id;
        private String senderName;
        private Long senderId;
        private String content;
        private String imageUrl;
        private Boolean deleted;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProofInfo {
        private Long id;
        private String submittedByName;
        private String description;
        private String characteristics;
        private String condition;
        private String discoveryLocation;
        private String serialNumber;
        private String status;
        private String reviewNote;
        private String photos;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LiveLocation {
        private String userName;
        private Long userId;
        private Double latitude;
        private Double longitude;
        private Double accuracyMeters;
        private LocalDateTime updatedAt;
    }
}
