package com.retrouvit.repository;

import com.retrouvit.entity.WithdrawalRequest;
import com.retrouvit.entity.WithdrawalStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WithdrawalRequestRepository extends JpaRepository<WithdrawalRequest, Long> {

    Optional<WithdrawalRequest> findByReference(String reference);

    List<WithdrawalRequest> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<WithdrawalRequest> findByStatusOrderByCreatedAtAsc(WithdrawalStatus status);

    /** Demandes en attente de validation finance (anti-fraude — CDC §8.2). */
    List<WithdrawalRequest> findByStatusInOrderByCreatedAtAsc(List<WithdrawalStatus> statuses);
}
