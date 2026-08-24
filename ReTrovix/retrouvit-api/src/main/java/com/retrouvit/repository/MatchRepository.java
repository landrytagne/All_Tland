package com.retrouvit.repository;

import com.retrouvit.entity.Match;
import com.retrouvit.entity.MatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MatchRepository extends JpaRepository<Match, Long> {
    List<Match> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Match> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, MatchStatus status);
    long countByUserId(Long userId);
    long countByUserIdAndStatus(Long userId, MatchStatus status);
}
