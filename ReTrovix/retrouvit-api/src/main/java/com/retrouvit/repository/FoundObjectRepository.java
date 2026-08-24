package com.retrouvit.repository;

import com.retrouvit.entity.FoundObject;
import com.retrouvit.entity.ObjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FoundObjectRepository extends JpaRepository<FoundObject, Long> {

    // Paginated queries
    @Query("SELECT fo FROM FoundObject fo WHERE fo.status = 'ACTIVE' ORDER BY fo.createdAt DESC")
    Page<FoundObject> findAllActive(Pageable pageable);

    Page<FoundObject> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<FoundObject> findByCategoryAndStatusOrderByCreatedAtDesc(String category, ObjectStatus status, Pageable pageable);

    Page<FoundObject> findByCityAndStatusOrderByCreatedAtDesc(String city, ObjectStatus status, Pageable pageable);

    // Non-paginated queries (used by MatchingEngine, etc.)
    @Query("SELECT fo FROM FoundObject fo WHERE fo.status = 'ACTIVE' ORDER BY fo.createdAt DESC")
    java.util.List<FoundObject> findAllActive();

    java.util.List<FoundObject> findByStatusOrderByCreatedAtDesc(ObjectStatus status);
    java.util.List<FoundObject> findByUserIdOrderByCreatedAtDesc(Long userId);
    java.util.List<FoundObject> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, ObjectStatus status);
    java.util.List<FoundObject> findByCategoryAndStatusOrderByCreatedAtDesc(String category, ObjectStatus status);
    java.util.List<FoundObject> findByCityAndStatusOrderByCreatedAtDesc(String city, ObjectStatus status);

    long countByUserId(Long userId);
    long countByUserIdAndStatus(Long userId, ObjectStatus status);
}
