package com.retrouvit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "matches")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lost_object_id", nullable = false)
    private LostObject lostObject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "found_object_id", nullable = false)
    private FoundObject foundObject;

    @Column(nullable = false)
    @Builder.Default
    private Integer matchScore = 0;

    /** Détail du score par critère (texte, géo, temporel, visuel) — CDC §4.3. */
    @Column(name = "score_breakdown", columnDefinition = "TEXT")
    private String scoreBreakdown;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private MatchStatus status = MatchStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
