package com.retrouvit.repository;

import com.retrouvit.entity.AlertLevel;
import com.retrouvit.entity.AlertThreshold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AlertThresholdRepository extends JpaRepository<AlertThreshold, Long> {

    List<AlertThreshold> findByCategoryOrderByLevelAsc(String category);

    List<AlertThreshold> findAllByOrderByCategoryAscLevelAsc();

    Optional<AlertThreshold> findByCategoryAndLevel(String category, AlertLevel level);

    List<AlertThreshold> findByEnabledTrue();

    List<AlertThreshold> findByCategoryAndEnabledTrue(String category);
}
