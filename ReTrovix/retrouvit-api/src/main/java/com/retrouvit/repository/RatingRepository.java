package com.retrouvit.repository;

import com.retrouvit.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface RatingRepository extends JpaRepository<Rating, Long> {

    List<Rating> findByRatedIdOrderByCreatedAtDesc(Long userId);

    List<Rating> findByRaterIdOrderByCreatedAtDesc(Long userId);

    Optional<Rating> findByReturnRequestIdAndRaterId(Long returnRequestId, Long raterId);

    boolean existsByReturnRequestIdAndRaterId(Long returnRequestId, Long raterId);

    @Query("SELECT COALESCE(AVG(r.stars), 0.0) FROM Rating r WHERE r.rated.id = :userId")
    double getAverageRating(Long userId);

    @Query("SELECT COUNT(r) FROM Rating r WHERE r.rated.id = :userId")
    long getRatingCount(Long userId);
}
