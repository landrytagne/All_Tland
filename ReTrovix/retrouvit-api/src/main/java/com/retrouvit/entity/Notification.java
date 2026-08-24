package com.retrouvit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private Boolean read = false;

    /** Optional: links to a conversation for CONVERSATION_REQUEST notifications */
    @Column(nullable = true)
    private Long conversationId;

    /** User who created the conversation (for CONVERSATION_REQUEST — to know who to hide buttons from) */
    @Column(nullable = true)
    private Long createdByUserId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
