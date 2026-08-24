package com.retrouvit.repository;

import com.retrouvit.entity.AdminAlert;
import com.retrouvit.entity.AlertLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdminAlertRepository extends JpaRepository<AdminAlert, Long> {

    List<AdminAlert> findByAcknowledgedFalseOrderByCreatedAtDesc();

    List<AdminAlert> findAllByOrderByCreatedAtDesc();

    List<AdminAlert> findByLevelAndAcknowledgedFalse(AlertLevel level);

    Optional<AdminAlert> findFirstByCategoryAndAcknowledgedFalseOrderByCreatedAtDesc(String category);

    long countByAcknowledgedFalse();
}
