package com.retrouvit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Événement d'audit de la collaboration — §24 : l'administrateur doit
 * pouvoir ouvrir une collaboration et voir toute sa timeline
 * (correspondance, vérification, proposition, paiement, mission,
 * confirmations, libération, avis...).
 */
@Entity
@Table(name = "collaboration_events", indexes = {
        @Index(name = "idx_collab_events_request", columnList = "return_request_id, created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollaborationEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "return_request_id", nullable = false)
    private ReturnRequest returnRequest;

    /** Acteur de l'événement (null = système). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    /** Type d'événement : MATCH_FOUND, VERIFIED, PROPOSAL_SENT, PAYMENT_SECURED, MISSION_STARTED, ARRIVED, HANDOVER_CONFIRMED, RECEIPT_CONFIRMED, FUNDS_RELEASED, RATING_PUBLISHED, DISPUTE_FILED, STATUS_CHANGED... */
    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    @Column(length = 500)
    private String description;

    /** Données additionnelles JSON (montants, positions, etc.). */
    @Column(columnDefinition = "TEXT")
    private String metadata;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
