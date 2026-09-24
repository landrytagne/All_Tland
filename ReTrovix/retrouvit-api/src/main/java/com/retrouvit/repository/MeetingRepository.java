package com.retrouvit.repository;

import com.retrouvit.entity.Meeting;
import com.retrouvit.entity.MeetingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting, Long> {

    List<Meeting> findByReturnRequestIdOrderByCreatedAtDesc(Long returnRequestId);

    Optional<Meeting> findFirstByReturnRequestIdAndStatusOrderByCreatedAtDesc(
            Long returnRequestId, MeetingStatus status);

    long countByReturnRequestIdAndStatus(Long returnRequestId, MeetingStatus status);
}
