package com.retrouvit.repository;

import com.retrouvit.entity.ObjectLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ObjectLikeRepository extends JpaRepository<ObjectLike, Long> {

    boolean existsByUserIdAndLostObjectId(Long userId, Long lostObjectId);

    boolean existsByUserIdAndFoundObjectId(Long userId, Long foundObjectId);

    int countByLostObjectId(Long lostObjectId);

    int countByFoundObjectId(Long foundObjectId);

    Optional<ObjectLike> findByUserIdAndLostObjectId(Long userId, Long lostObjectId);

    Optional<ObjectLike> findByUserIdAndFoundObjectId(Long userId, Long foundObjectId);

    void deleteByUserIdAndLostObjectId(Long userId, Long lostObjectId);

    void deleteByUserIdAndFoundObjectId(Long userId, Long foundObjectId);

    List<ObjectLike> findByUserIdOrderByCreatedAtDesc(Long userId);
}
