package com.retrouvit.repository;

import com.retrouvit.entity.RefreshToken;
import com.retrouvit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.List;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    Optional<RefreshToken> findByTokenAndRevokedFalse(String token);

    void deleteByUserId(Long userId);

    @Modifying
    @Transactional
    @Query("UPDATE RefreshToken r SET r.revoked = true WHERE r.user.id = :userId")
    int revokeAllByUserId(Long userId);

    long countByUserIdAndRevokedFalse(Long userId);

    /** Sessions actives d'un utilisateur, de la plus récente à la plus ancienne. */
    List<RefreshToken> findByUserIdAndRevokedFalseOrderByCreatedAtDesc(Long userId);
}
