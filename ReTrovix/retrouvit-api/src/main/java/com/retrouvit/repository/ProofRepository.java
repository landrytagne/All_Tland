package com.retrouvit.repository;

import com.retrouvit.entity.Proof;
import com.retrouvit.entity.ProofStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProofRepository extends JpaRepository<Proof, Long> {

    List<Proof> findByReturnRequestIdOrderByCreatedAtDesc(Long returnRequestId);

    Optional<Proof> findFirstByReturnRequestIdAndStatusOrderByCreatedAtDesc(Long returnRequestId, ProofStatus status);

    boolean existsByReturnRequestIdAndStatus(Long returnRequestId, ProofStatus status);

    long countByReturnRequestIdAndStatus(Long returnRequestId, ProofStatus status);
}
