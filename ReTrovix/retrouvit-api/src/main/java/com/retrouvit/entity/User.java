package com.retrouvit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Role role = Role.USER;

    private String phone;
    private String location;
    private String avatar;

    @Column(nullable = false)
    @Builder.Default
    private Integer trustScore = 50;

    @Column(nullable = false)
    @Builder.Default
    private Integer objectsFound = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer objectsLost = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer matches = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean verified = false;

    @Column(nullable = false)
    @Builder.Default
    private Long walletBalance = 0L;

    @Column(nullable = false)
    @Builder.Default
    private Boolean banned = false;

    /** Compte activé — false entre l'inscription et la validation OTP (CDC §5.1). */
    @Builder.Default
    @Column(nullable = false)
    private Boolean enabled = true;

    /** L'email a été confirmé via OTP au moins une fois. */
    @Builder.Default
    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified = false;

    /** 2FA par OTP email activée pour ce compte (défaut : true pour les comptes locaux, CDC §4.1). */
    @Builder.Default
    @Column(name = "two_factor_enabled", nullable = false)
    private Boolean twoFactorEnabled = true;

    private String banReason;

    private LocalDateTime bannedAt;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
