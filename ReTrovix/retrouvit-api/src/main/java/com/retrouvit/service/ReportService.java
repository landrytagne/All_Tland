package com.retrouvit.service;

import com.retrouvit.dto.ReportRequest;
import com.retrouvit.dto.ReportResponse;
import com.retrouvit.dto.UserResponse;
import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final LostObjectRepository lostObjectRepository;
    private final FoundObjectRepository foundObjectRepository;

    /**
     * Create a new report (user submits a complaint).
     */
    @Transactional
    public ReportResponse createReport(Long reporterId, ReportRequest request) {
        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        Report report = Report.builder()
                .reporter(reporter)
                .type(ReportType.valueOf(request.getType().toUpperCase()))
                .subject(request.getSubject())
                .description(request.getDescription())
                .priority(determinePriority(request.getType()))
                .build();

        // Set reported user if provided
        if (request.getReportedUserId() != null) {
            User reported = userRepository.findById(request.getReportedUserId())
                    .orElse(null);
            report.setReported(reported);
        }

        // Set related objects if provided
        if (request.getLostObjectId() != null) {
            LostObject lostObj = lostObjectRepository.findById(request.getLostObjectId()).orElse(null);
            report.setLostObject(lostObj);
        }
        if (request.getFoundObjectId() != null) {
            FoundObject foundObj = foundObjectRepository.findById(request.getFoundObjectId()).orElse(null);
            report.setFoundObject(foundObj);
        }

        report.setRelatedTransaction(request.getRelatedTransaction());
        report.setAmount(request.getAmount());

        Report saved = reportRepository.save(report);
        log.info("Report created: {} by user {}", saved.getId(), reporterId);

        return toResponse(saved);
    }

    /**
     * Get all reports (admin only).
     */
    public List<ReportResponse> getAllReports() {
        return reportRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get report by ID.
     */
    public ReportResponse getReportById(Long reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Réclamation non trouvée"));
        return toResponse(report);
    }

    /**
     * Get reports by status (admin).
     */
    public List<ReportResponse> getReportsByStatus(ReportStatus status) {
        return reportRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get reports by type (admin).
     */
    public List<ReportResponse> getReportsByType(ReportType type) {
        return reportRepository.findByTypeOrderByCreatedAtDesc(type).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get reports submitted by a user.
     */
    public List<ReportResponse> getReportsByReporter(Long reporterId) {
        return reportRepository.findByReporterIdOrderByCreatedAtDesc(reporterId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get reports about a user.
     */
    public List<ReportResponse> getReportsByReported(Long reportedId) {
        return reportRepository.findByReportedIdOrderByCreatedAtDesc(reportedId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Update report status (admin).
     */
    @Transactional
    public ReportResponse updateStatus(Long reportId, ReportStatus newStatus, Long adminId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Réclamation non trouvée"));

        report.setStatus(newStatus);
        if (newStatus == ReportStatus.RESOLVED) {
            report.setResolvedBy(adminId);
        }

        Report saved = reportRepository.save(report);
        log.info("Report {} status updated to {} by admin {}", reportId, newStatus, adminId);

        return toResponse(saved);
    }

    /**
     * Resolve a report with resolution note (admin).
     */
    @Transactional
    public ReportResponse resolveReport(Long reportId, String resolution, Long adminId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Réclamation non trouvée"));

        report.setStatus(ReportStatus.RESOLVED);
        report.setResolution(resolution);
        report.setResolvedBy(adminId);

        Report saved = reportRepository.save(report);
        log.info("Report {} resolved by admin {}", reportId, adminId);

        return toResponse(saved);
    }

    /**
     * Escalate a report (admin).
     */
    @Transactional
    public ReportResponse escalateReport(Long reportId, Long adminId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Réclamation non trouvée"));

        report.setStatus(ReportStatus.ESCALATED);
        report.setPriority("HIGH");

        Report saved = reportRepository.save(report);
        log.info("Report {} escalated by admin {}", reportId, adminId);

        return toResponse(saved);
    }

    /**
     * Dismiss a report (admin).
     */
    @Transactional
    public ReportResponse dismissReport(Long reportId, String reason, Long adminId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Réclamation non trouvée"));

        report.setStatus(ReportStatus.DISMISSED);
        report.setResolution(reason);
        report.setResolvedBy(adminId);

        Report saved = reportRepository.save(report);
        log.info("Report {} dismissed by admin {}", reportId, adminId);

        return toResponse(saved);
    }

    /**
     * Delete a report (admin).
     */
    @Transactional
    public void deleteReport(Long reportId) {
        reportRepository.deleteById(reportId);
        log.info("Report {} deleted", reportId);
    }

    /**
     * Get report counts by status.
     */
    public long getCountByStatus(ReportStatus status) {
        return reportRepository.countByStatus(status);
    }

    private String determinePriority(String type) {
        return switch (type.toUpperCase()) {
            case "FRAUD", "SCAM", "HARASSMENT", "IDENTITY" -> "HIGH";
            case "PAYMENT_DISPUTE" -> "CRITICAL";
            case "FAKE_LISTING" -> "MEDIUM";
            default -> "LOW";
        };
    }

    private ReportResponse toResponse(Report report) {
        return ReportResponse.builder()
                .id(report.getId())
                .type(report.getType().name())
                .status(report.getStatus().name())
                .subject(report.getSubject())
                .description(report.getDescription())
                .reporter(toUserResponse(report.getReporter()))
                .reported(report.getReported() != null ? toUserResponse(report.getReported()) : null)
                .lostObjectId(report.getLostObject() != null ? report.getLostObject().getId() : null)
                .lostObjectTitle(report.getLostObject() != null ? report.getLostObject().getTitle() : null)
                .foundObjectId(report.getFoundObject() != null ? report.getFoundObject().getId() : null)
                .foundObjectTitle(report.getFoundObject() != null ? report.getFoundObject().getTitle() : null)
                .relatedTransaction(report.getRelatedTransaction())
                .amount(report.getAmount())
                .priority(report.getPriority())
                .resolution(report.getResolution())
                .resolvedBy(report.getResolvedBy())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .trustScore(user.getTrustScore())
                .verified(user.getVerified())
                .banned(user.getBanned())
                .build();
    }
}
