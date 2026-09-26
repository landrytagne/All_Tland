package com.retrouvit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "found_objects")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoundObject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String location;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private LocalDate dateFound;

    private String image;
    private String images; // JSON array of image URLs

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ObjectStatus status = ObjectStatus.ACTIVE;

    @Column(nullable = false)
    @Builder.Default
    private Integer views = 0;

    // ─── Vérification de propriété (§2 / CDC §4.2) ─────────
    /** Question de vérification affichée au Chercheur avant mise en relation. */
    @Column(name = "verification_question", length = 500)
    private String verificationQuestion;

    /** Réponse hachée (bcrypt) — jamais stockée ni exposée en clair (CDC §6.2). */
    @Column(name = "verification_answer_hash", length = 255)
    private String verificationAnswerHash;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
