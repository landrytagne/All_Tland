package com.retrouvit.repository;

import com.retrouvit.entity.SavedObject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavedObjectRepository extends JpaRepository<SavedObject, Long> {

    boolean existsByUserIdAndLostObjectId(Long userId, Long lostObjectId);

    boolean existsByUserIdAndFoundObjectId(Long userId, Long foundObjectId);

    Optional<SavedObject> findByUserIdAndLostObjectId(Long userId, Long lostObjectId);

    Optional<SavedObject> findByUserIdAndFoundObjectId(Long userId, Long foundObjectId);

    void deleteByUserIdAndLostObjectId(Long userId, Long lostObjectId);

    void deleteByUserIdAndFoundObjectId(Long userId, Long foundObjectId);

    List<SavedObject> findByUserIdOrderByCreatedAtDesc(Long userId);

    int countByUserId(Long userId);
}
