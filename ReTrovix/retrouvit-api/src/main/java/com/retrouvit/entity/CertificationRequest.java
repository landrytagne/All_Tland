package com.retrouvit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "certification_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CertificationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // ─── Documents ──────────────────────────────────────────
    @Column(name = "document_type", nullable = false)
    private String documentType; // CNI, PASSEPORT, PERMIS, etc.

    @Column(name = "document_url", nullable = false)
    private String documentUrl; // URL of uploaded document image

    @Column(name = "selfie_url")
    private String selfieUrl; // Optional selfie holding the document

    // ─── Eligibility criteria snapshot ──────────────────────
    @Column(name = "active_status", nullable = false)
    @Builder.Default
    private Boolean activeStatus = true; // User must be active (not banned)

    @Column(name = "return_count_at_submission", nullable = false)
    @Builder.Default
    private Integer returnCountAtSubmission = 0; // Completed returns count

    @Column(name = "trust_score_at_submission", nullable = false)
    @Builder.Default
    private Integer trustScoreAtSubmission = 50; // Trust score at time of submission

    // ─── Status ─────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private CertificationStatus status = CertificationStatus.PENDING;

    // ─── Admin review ───────────────────────────────────────
    @Column(name = "reviewed_by")
    private Long reviewedBy; // Admin user ID

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason; // Why it was rejected

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes; // Internal admin notes

    // ─── Timestamps ─────────────────────────────────────────
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
