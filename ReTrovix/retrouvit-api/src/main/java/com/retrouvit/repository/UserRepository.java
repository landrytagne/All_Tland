package com.retrouvit.repository;

import com.retrouvit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByBannedTrue();
    long countByCreatedAtAfter(LocalDateTime date);
}
