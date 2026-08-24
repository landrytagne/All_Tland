package com.retrouvit.repository;

import com.retrouvit.entity.CertificationRequest;
import com.retrouvit.entity.CertificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CertificationRequestRepository extends JpaRepository<CertificationRequest, Long> {

    List<CertificationRequest> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<CertificationRequest> findByUserIdAndStatus(Long userId, CertificationStatus status);

    List<CertificationRequest> findByStatusOrderByCreatedAtDesc(CertificationStatus status);

    long countByStatus(CertificationStatus status);

    boolean existsByUserIdAndStatus(Long userId, CertificationStatus status);
}
