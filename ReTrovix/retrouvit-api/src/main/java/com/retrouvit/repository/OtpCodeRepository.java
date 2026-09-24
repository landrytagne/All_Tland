package com.retrouvit.repository;

import com.retrouvit.entity.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {

    /** Dernier code actif (non consommé) pour un email et un usage donnés. */
    Optional<OtpCode> findFirstByEmailAndPurposeAndConsumedFalseOrderByCreatedAtDesc(String email, String purpose);

    @Modifying
    @Transactional
    @Query("UPDATE OtpCode o SET o.consumed = true WHERE o.email = :email AND o.purpose = :purpose")
    void consumeAllByEmailAndPurpose(String email, String purpose);

    /** Purge des codes expirés/consommés (hygiène, appelé à chaque génération). */
    @Modifying
    @Transactional
    @Query("DELETE FROM OtpCode o WHERE o.expiresAt < :now OR o.consumed = true")
    void deleteExpiredOrConsumed(java.time.LocalDateTime now);
}
