package com.retrouvit.repository;

import com.retrouvit.entity.LostObject;
import com.retrouvit.entity.ObjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface LostObjectRepository extends JpaRepository<LostObject, Long> {

    // Paginated queries
    @Query("SELECT lo FROM LostObject lo WHERE lo.status = 'ACTIVE' ORDER BY lo.createdAt DESC")
    Page<LostObject> findAllActive(Pageable pageable);

    Page<LostObject> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<LostObject> findByCategoryAndStatusOrderByCreatedAtDesc(String category, ObjectStatus status, Pageable pageable);

    Page<LostObject> findByCityAndStatusOrderByCreatedAtDesc(String city, ObjectStatus status, Pageable pageable);

    // Non-paginated queries (used by MatchingEngine, etc.)
    @Query("SELECT lo FROM LostObject lo WHERE lo.status = 'ACTIVE' ORDER BY lo.createdAt DESC")
    java.util.List<LostObject> findAllActive();

    java.util.List<LostObject> findByStatusOrderByCreatedAtDesc(ObjectStatus status);
    java.util.List<LostObject> findByUserIdOrderByCreatedAtDesc(Long userId);
    java.util.List<LostObject> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, ObjectStatus status);
    java.util.List<LostObject> findByCategoryAndStatusOrderByCreatedAtDesc(String category, ObjectStatus status);
    java.util.List<LostObject> findByCityAndStatusOrderByCreatedAtDesc(String city, ObjectStatus status);

    long countByUserId(Long userId);
    long countByUserIdAndStatus(Long userId, ObjectStatus status);
    long countByCategory(String category);
    long countByCity(String city);
}
