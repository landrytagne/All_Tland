package com.retrouvit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "return_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lost_object_id")
    private LostObject lostObject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "found_object_id")
    private FoundObject foundObject;

    // The person who lost the item
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loser_id", nullable = false)
    private User loser;

    // The person who found the item
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finder_id", nullable = false)
    private User finder;

    // ─── Reward ─────────────────────────────────────────────
    @Column(name = "proposed_amount")
    private Long proposedAmount;

    @Column(name = "accepted_amount")
    private Long acceptedAmount;

    @Column(name = "platform_fee_pct", nullable = false)
    @Builder.Default
    private Integer platformFeePct = 15;

    // ─── Escrow ─────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "escrow_id")
    private Escrow escrow;

    // ─── Proof ──────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "proof_status")
    @Builder.Default
    private ProofStatus proofStatus = null;

    // ─── Appointment (legacy fields kept for backward compat) ─
    @Column(name = "meeting_date")
    private LocalDateTime meetingDate;

    @Column(name = "meeting_location")
    private String meetingLocation;

    @Column(name = "meeting_lat")
    private Double meetingLat;

    @Column(name = "meeting_lng")
    private Double meetingLng;

    // ─── Status ─────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReturnStatus status = ReturnStatus.CHAT_INITIATED;

    // ─── Validations ────────────────────────────────────────
    @Column(name = "loser_validated")
    @Builder.Default
    private Boolean loserValidated = false;

    @Column(name = "finder_validated")
    @Builder.Default
    private Boolean finderValidated = false;

    @Column(name = "loser_return_confirmed")
    @Builder.Default
    private Boolean loserReturnConfirmed = false;

    @Column(name = "finder_return_confirmed")
    @Builder.Default
    private Boolean finderReturnConfirmed = false;

    // ─── Dispute ────────────────────────────────────────────
    @Column(name = "dispute_reason", columnDefinition = "TEXT")
    private String disputeReason;

    @Column(name = "dispute_resolved")
    @Builder.Default
    private Boolean disputeResolved = false;

    @Column(name = "dispute_resolution", columnDefinition = "TEXT")
    private String disputeResolution;

    @Column(name = "disputed_by")
    private Long disputedBy;

    // ─── Payment ────────────────────────────────────────────
    @Column(name = "payment_amount")
    private Long paymentAmount;

    @Column(name = "platform_fee")
    private Long platformFee;

    // ─── Collaboration & Release ─────────────────────────────
    @Column(name = "collaboration_started_at")
    private LocalDateTime collaborationStartedAt;

    @Column(name = "released_at")
    private LocalDateTime releasedAt;

    // ─── Timestamps ─────────────────────────────────────────
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public boolean isFullyValidated() {
        return Boolean.TRUE.equals(loserValidated) && Boolean.TRUE.equals(finderValidated);
    }

    public boolean isFullyReturned() {
        return Boolean.TRUE.equals(loserReturnConfirmed) && Boolean.TRUE.equals(finderReturnConfirmed);
    }
}
