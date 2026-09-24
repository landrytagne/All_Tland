package com.retrouvit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Offre de négociation pour la récompense.
 * Chaque offre est liée à une demande de retour.
 */
@Entity
@Table(name = "negotiation_offers")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class NegotiationOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "return_request_id", nullable = false)
    private ReturnRequest returnRequest;

    /** Utilisateur qui a fait l'offre */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offered_by_id", nullable = false)
    private User offeredBy;

    /** Montant proposé (en XAF) */
    @Column(nullable = false)
    private Long amount;

    /** Statut de l'offre */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NegotiationStatus status = NegotiationStatus.PROPOSED;

    /** Référence à l'offre précédente (pour les contre-propositions) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_offer_id")
    private NegotiationOffer parentOffer;

    /** Message optionnel accompagnant l'offre */
    @Column(columnDefinition = "TEXT")
    private String message;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
