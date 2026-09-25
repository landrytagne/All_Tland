package com.retrouvit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Demande de retrait du wallet vers Mobile Money — CDC §5.4/§8.2.
 * Le solde est débité à la demande et recrédité en cas d'échec/refus.
 */
@Entity
@Table(name = "withdrawal_requests", indexes = {
        @Index(name = "idx_withdrawals_user", columnList = "user_id"),
        @Index(name = "idx_withdrawals_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WithdrawalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(nullable = false)
    private Long amount;

    /** MTN_MOMO / ORANGE_MONEY / BANK_TRANSFER. */
    @Column(nullable = false, length = 255)
    private String method;

    @Column(name = "phone_number", length = 255)
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private WithdrawalStatus status = WithdrawalStatus.PENDING_REVIEW;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    /** Admin finance ayant validé/rejeté (audit). */
    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
