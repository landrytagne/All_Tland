package com.retrouvit.repository;

import com.retrouvit.entity.CollaborationEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CollaborationEventRepository extends JpaRepository<CollaborationEvent, Long> {

    /** Timeline chronologique de la collaboration (§24). */
    List<CollaborationEvent> findByReturnRequestIdOrderByCreatedAtAsc(Long returnRequestId);
}
