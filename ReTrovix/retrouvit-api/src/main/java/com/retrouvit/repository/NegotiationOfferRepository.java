package com.retrouvit.repository;

import com.retrouvit.entity.NegotiationOffer;
import com.retrouvit.entity.NegotiationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NegotiationOfferRepository extends JpaRepository<NegotiationOffer, Long> {

    List<NegotiationOffer> findByReturnRequestIdOrderByCreatedAtAsc(Long returnRequestId);

    Optional<NegotiationOffer> findFirstByReturnRequestIdAndStatusOrderByCreatedAtDesc(
            Long returnRequestId, NegotiationStatus status);

    long countByReturnRequestId(Long returnRequestId);
}
