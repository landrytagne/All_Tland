package com.retrouvit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Position partagée d'un utilisateur dans une collaboration — §13.
 *
 * Confidentialité (§13) :
 * - Avant mission        → aucune ligne (position masquée)
 * - Mission démarrée     → position temporairement disponible
 * - Restitution terminée → partage automatiquement désactivé (§20)
 *
 * Une seule ligne par (collaboration, utilisateur) — mise à jour
 * à chaque ping de géolocalisation.
 */
@Entity
@Table(name = "collaboration_locations",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_collab_loc_user",
                columnNames = {"return_request_id", "user_id"}),
        indexes = @Index(name = "idx_collab_loc_request", columnList = "return_request_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollaborationLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "return_request_id", nullable = false)
    private ReturnRequest returnRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    /** Précision du fix GPS en mètres (optionnel). */
    @Column(name = "accuracy_meters")
    private Double accuracyMeters;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
