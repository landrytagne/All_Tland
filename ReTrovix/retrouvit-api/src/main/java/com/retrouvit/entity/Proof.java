package com.retrouvit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Preuves soumises par le trouveur pour prouver qu'il détient l'objet.
 */
@Entity
@Table(name = "proofs")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Proof {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "return_request_id", nullable = false)
    private ReturnRequest returnRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by_id", nullable = false)
    private User submittedBy;

    /** Description détaillée de l'objet */
    @Column(columnDefinition = "TEXT")
    private String description;

    /** Caractéristiques physiques (couleur, taille, marque, etc.) */
    @Column(columnDefinition = "TEXT")
    private String characteristics;

    /** État de l'objet (neuf, usé, endommagé, etc.) */
    @Column(length = 100)
    private String condition;

    /** Lieu de découverte */
    @Column(length = 255)
    private String discoveryLocation;

    /** Date/heure de découverte */
    private LocalDateTime discoveryDateTime;

    /** Numéro de série / IMEI / information d'identification unique */
    @Column(length = 255)
    private String serialNumber;

    /** Informations techniques pertinentes */
    @Column(columnDefinition = "TEXT")
    private String technicalInfo;

    /** Photos (URLs séparées par virgule) */
    @Column(columnDefinition = "TEXT")
    private String photos;

    /** Statut de la review */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProofStatus status = ProofStatus.SUBMITTED;

    /** Raison du rejet ou de la demande d'info supplémentaire */
    @Column(columnDefinition = "TEXT")
    private String reviewNote;

    /** Nombre de demandes d'info supplémentaire (pour limiter les abus) */
    @Builder.Default
    @Column(nullable = false)
    private int additionalInfoRequests = 0;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
