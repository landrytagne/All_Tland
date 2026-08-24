package com.retrouvit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "object_likes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "lost_object_id"}),
    @UniqueConstraint(columnNames = {"user_id", "found_object_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ObjectLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lost_object_id")
    private LostObject lostObject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "found_object_id")
    private FoundObject foundObject;

    @CreationTimestamp
    @Column(updatable = false)
    private java.time.LocalDateTime createdAt;
}
