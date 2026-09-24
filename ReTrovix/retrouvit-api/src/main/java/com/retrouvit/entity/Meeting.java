package com.retrouvit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Rendez-vous pour l'organisation de la restitution.
 */
@Entity
@Table(name = "meetings")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "return_request_id", nullable = false)
    private ReturnRequest returnRequest;

    /** Utilisateur qui a proposé le rendez-vous */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposed_by_id", nullable = false)
    private User proposedBy;

    /** Date et heure du rendez-vous */
    @Column(nullable = false)
    private LocalDateTime meetingDateTime;

    /** Lieu du rendez-vous */
    @Column(nullable = false, length = 500)
    private String location;

    /** Latitude (optionnel) */
    private Double latitude;

    /** Longitude (optionnel) */
    private Double longitude;

    /** Statut du rendez-vous */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MeetingStatus status = MeetingStatus.PROPOSED;

    /** Notes additionnelles */
    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
