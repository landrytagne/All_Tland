package com.retrouvit.repository;

import com.retrouvit.entity.ReturnRequest;
import com.retrouvit.entity.ReturnStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {

    List<ReturnRequest> findByLoserIdOrFinderIdOrderByCreatedAtDesc(Long userId1, Long userId2);

    Optional<ReturnRequest> findByLoserIdAndFinderId(Long loserId, Long finderId);

    Optional<ReturnRequest> findByLostObjectId(Long lostObjectId);

    Optional<ReturnRequest> findByFoundObjectId(Long foundObjectId);

    List<ReturnRequest> findByStatus(ReturnStatus status);

    List<ReturnRequest> findByLoserIdAndStatus(Long userId, ReturnStatus status);

    List<ReturnRequest> findByFinderIdAndStatus(Long userId, ReturnStatus status);

    boolean existsByLostObjectIdAndFinderId(Long lostObjectId, Long finderId);
}
