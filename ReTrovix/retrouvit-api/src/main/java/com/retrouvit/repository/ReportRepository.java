package com.retrouvit.repository;

import com.retrouvit.entity.Report;
import com.retrouvit.entity.ReportStatus;
import com.retrouvit.entity.ReportType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findAllByOrderByCreatedAtDesc();
    List<Report> findByStatusOrderByCreatedAtDesc(ReportStatus status);
    List<Report> findByTypeOrderByCreatedAtDesc(ReportType type);
    List<Report> findByReporterIdOrderByCreatedAtDesc(Long reporterId);
    List<Report> findByReportedIdOrderByCreatedAtDesc(Long reportedId);
    long countByStatus(ReportStatus status);
    long countByType(ReportType type);
}
