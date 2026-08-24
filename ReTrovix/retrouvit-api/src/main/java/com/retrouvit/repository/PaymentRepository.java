package com.retrouvit.repository;

import com.retrouvit.entity.Payment;
import com.retrouvit.entity.PaymentProvider;
import com.retrouvit.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Payment> findByReference(String reference);
    Optional<Payment> findByExternalReference(String externalReference);
    List<Payment> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, PaymentStatus status);
    long countByUserIdAndStatus(Long userId, PaymentStatus status);

    // Admin queries
    List<Payment> findAllByOrderByCreatedAtDesc();
    List<Payment> findByStatusOrderByCreatedAtDesc(PaymentStatus status);
    List<Payment> findByProviderOrderByCreatedAtDesc(PaymentProvider provider);
    List<Payment> findByUser_NameContainingIgnoreCaseOrReferenceContainingIgnoreCase(String userName, String reference);

    @Query("SELECT COUNT(p) FROM Payment p")
    long countAll();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = 'COMPLETED'")
    long sumCompletedAmount();

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.status = 'PENDING' OR p.status = 'PROCESSING'")
    long countPending();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = 'PENDING' OR p.status = 'PROCESSING'")
    long sumPendingAmount();
}
