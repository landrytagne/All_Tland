package com.retrouvit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Code OTP à usage unique pour la 2FA par email (CDC §6.1).
 * Le code est stocké uniquement sous forme hachée (bcrypt) ;
 * l'email est conservé en clair pour l'envoi.
 */
@Entity
@Table(name = "otp_codes", indexes = {
        @Index(name = "idx_otp_email_active", columnList = "email, purpose, consumed")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OtpCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String email;

    /** Haché avec bcrypt — jamais stocké ni loggué en clair. */
    @Column(name = "code_hash", nullable = false, length = 255)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** Usage unique : passe à true dès la validation. */
    @Column(nullable = false)
    @Builder.Default
    private Boolean consumed = false;

    /** Nombre de tentatives de saisie (max 5 puis verrouillage). */
    @Column(nullable = false)
    @Builder.Default
    private Integer attempts = 0;

    /** LOGIN / REGISTER / PASSWORD_RESET. */
    @Column(nullable = false, length = 32)
    @Builder.Default
    private String purpose = "LOGIN";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    /** Verrouillé au-delà du max de tentatives (CDC : 5). */
    public boolean isLocked() {
        return attempts >= 5;
    }

    public boolean isUsable() {
        return !consumed && !isExpired() && !isLocked();
    }
}
