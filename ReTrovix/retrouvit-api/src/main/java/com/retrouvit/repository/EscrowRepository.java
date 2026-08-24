package com.retrouvit.repository;

import com.retrouvit.entity.Escrow;
import com.retrouvit.entity.EscrowStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EscrowRepository extends JpaRepository<Escrow, Long> {
    List<Escrow> findByBuyerIdOrSellerIdOrderByCreatedAtDesc(Long buyerId, Long sellerId);
    List<Escrow> findByBuyerIdAndStatusOrSellerIdAndStatusOrderByCreatedAtDesc(
            Long buyerId, EscrowStatus status1, Long sellerId, EscrowStatus status2);
    List<Escrow> findByStatusOrderByCreatedAtDesc(EscrowStatus status);
    long countByBuyerIdOrSellerId(Long buyerId, Long sellerId);
}
