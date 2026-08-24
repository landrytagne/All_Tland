package com.retrouvit.service;

import com.retrouvit.dto.AdminAlertResponse;
import com.retrouvit.entity.*;
import com.retrouvit.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAlertService {

    private final AdminAlertRepository alertRepository;
    private final UserRepository userRepository;
    private final LostObjectRepository lostObjectRepository;
    private final FoundObjectRepository foundObjectRepository;
    private final MatchRepository matchRepository;
    private final ReportRepository reportRepository;
    private final com.retrouvit.controller.WebSocketNotificationController wsController;
    private final EmailService emailService;
    private final AlertThresholdService thresholdService;

    /**
     * Check all thresholds and create/update alerts.
     * Runs every 30 seconds.
     */
    @Scheduled(fixedRate = 30000)
    public void checkThresholds() {
        try {
            List<AdminAlert> newAlerts = new ArrayList<>();

            // 1. Pending reports
            long pendingReports = reportRepository.countByStatus(ReportStatus.PENDING);
            if (thresholdService.isEnabled("PENDING_REPORTS", AlertLevel.WARNING) ||
                thresholdService.isEnabled("PENDING_REPORTS", AlertLevel.CRITICAL)) {
                newAlerts.addAll(checkThreshold(
                    "PENDING_REPORTS",
                    "Signalements en attente",
                    pendingReports,
                    thresholdService.getThreshold("PENDING_REPORTS", AlertLevel.WARNING),
                    thresholdService.getThreshold("PENDING_REPORTS", AlertLevel.CRITICAL),
                    "signalements en attente de traitement"
                ));
            }

            // 2. Escalated reports
            long escalatedReports = reportRepository.countByStatus(ReportStatus.ESCALATED);
            if (thresholdService.isEnabled("ESCALATED_REPORTS", AlertLevel.WARNING) ||
                thresholdService.isEnabled("ESCALATED_REPORTS", AlertLevel.CRITICAL)) {
                newAlerts.addAll(checkThreshold(
                    "ESCALATED_REPORTS",
                    "Signalements escaladés",
                    escalatedReports,
                    thresholdService.getThreshold("ESCALATED_REPORTS", AlertLevel.WARNING),
                    thresholdService.getThreshold("ESCALATED_REPORTS", AlertLevel.CRITICAL),
                    "signalements escaladés nécessitant une action urgente"
                ));
            }

            // 3. Banned users
            long bannedUsers = userRepository.countByBannedTrue();
            if (thresholdService.isEnabled("BANNED_USERS", AlertLevel.WARNING) ||
                thresholdService.isEnabled("BANNED_USERS", AlertLevel.CRITICAL)) {
                newAlerts.addAll(checkThreshold(
                    "BANNED_USERS",
                    "Utilisateurs bannis",
                    bannedUsers,
                    thresholdService.getThreshold("BANNED_USERS", AlertLevel.WARNING),
                    thresholdService.getThreshold("BANNED_USERS", AlertLevel.CRITICAL),
                    "utilisateurs bannis sur la plateforme"
                ));
            }

            // 4. Low active objects (warning if < threshold)
            long activeLost = lostObjectRepository.count();
            long activeFound = foundObjectRepository.count();
            long totalActive = activeLost + activeFound;
            long activeObjectsThreshold = thresholdService.getThreshold("LOW_ACTIVE_OBJECTS", AlertLevel.WARNING);
            if (thresholdService.isEnabled("LOW_ACTIVE_OBJECTS", AlertLevel.WARNING) &&
                totalActive < activeObjectsThreshold && totalActive > 0) {
                newAlerts.addAll(checkThresholdLow(
                    "LOW_ACTIVE_OBJECTS",
                    "Objets actifs insuffisants",
                    totalActive,
                    activeObjectsThreshold,
                    "objets actifs — la plateforme manque de contenu"
                ));
            }

            // 5. Low match conversion
            long totalMatches = matchRepository.count();
            long totalObjects = lostObjectRepository.count() + foundObjectRepository.count();
            long matchThreshold = thresholdService.getThreshold("LOW_MATCH_RATE", AlertLevel.WARNING);
            if (thresholdService.isEnabled("LOW_MATCH_RATE", AlertLevel.WARNING) &&
                totalObjects > 10 && totalMatches < matchThreshold) {
                newAlerts.addAll(checkThreshold(
                    "LOW_MATCH_RATE",
                    "Taux de match faible",
                    totalMatches,
                    matchThreshold,
                    matchThreshold,
                    "matches pour " + totalObjects + " objets — le moteur de matching peut nécessiter un ajustement"
                ));
            }

            // 6. No new users today
            LocalDateTime todayStart = LocalDate.now().atStartOfDay();
            long todayUsers = userRepository.countByCreatedAtAfter(todayStart);
            long newUserThreshold = thresholdService.getThreshold("NO_NEW_USERS", AlertLevel.WARNING);
            if (thresholdService.isEnabled("NO_NEW_USERS", AlertLevel.WARNING) &&
                todayUsers < newUserThreshold) {
                newAlerts.addAll(checkThreshold(
                    "NO_NEW_USERS",
                    "Aucun nouvel utilisateur aujourd'hui",
                    todayUsers,
                    newUserThreshold,
                    newUserThreshold,
                    "inscriptions aujourd'hui — la croissance est au point mort"
                ));
            }

            // Save new alerts and broadcast
            if (!newAlerts.isEmpty()) {
                List<AdminAlert> saved = alertRepository.saveAll(newAlerts);
                broadcastAlerts(saved);

                // Send email for CRITICAL alerts
                saved.stream()
                    .filter(a -> a.getLevel() == AlertLevel.CRITICAL)
                    .forEach(emailService::sendCriticalAlertToAdmins);

                log.info("Created {} new admin alerts", saved.size());
            }

        } catch (Exception e) {
            log.error("Failed to check thresholds: {}", e.getMessage());
        }
    }

    /**
     * Check a threshold that triggers when value exceeds the threshold.
     */
    private List<AdminAlert> checkThreshold(
            String category, String title, long currentValue,
            long warningThreshold, long criticalThreshold, String description) {

        List<AdminAlert> alerts = new ArrayList<>();

        // Only create alert if none exists for this category (dedup)
        Optional<AdminAlert> existing = alertRepository.findFirstByCategoryAndAcknowledgedFalseOrderByCreatedAtDesc(category);

        if (existing.isPresent()) {
            // Update existing alert if level changed
            AdminAlert alert = existing.get();
            AlertLevel newLevel = currentValue >= criticalThreshold ? AlertLevel.CRITICAL :
                                  currentValue >= warningThreshold ? AlertLevel.WARNING : AlertLevel.INFO;

            if (alert.getLevel() != newLevel) {
                AlertLevel previousLevel = alert.getLevel();
                alert.setLevel(newLevel);
                alert.setCurrentValue(currentValue);
                alert.setMessage(currentValue + " " + description);
                alertRepository.save(alert);

                // Send escalation email if level changed to CRITICAL
                if (newLevel == AlertLevel.CRITICAL && previousLevel != AlertLevel.CRITICAL) {
                    emailService.sendAlertEscalationEmail(alert, previousLevel);
                }
            }
            return alerts;
        }

        // Create new alert if threshold exceeded
        if (currentValue >= criticalThreshold) {
            alerts.add(AdminAlert.builder()
                    .level(AlertLevel.CRITICAL)
                    .category(category)
                    .title("🔴 " + title)
                    .message(currentValue + " " + description)
                    .currentValue(currentValue)
                    .thresholdValue(criticalThreshold)
                    .build());
        } else if (currentValue >= warningThreshold) {
            alerts.add(AdminAlert.builder()
                    .level(AlertLevel.WARNING)
                    .category(category)
                    .title("🟡 " + title)
                    .message(currentValue + " " + description)
                    .currentValue(currentValue)
                    .thresholdValue(warningThreshold)
                    .build());
        }

        return alerts;
    }

    /**
     * Check a threshold that triggers when value is below the threshold.
     */
    private List<AdminAlert> checkThresholdLow(
            String category, String title, long currentValue,
            long threshold, String description) {

        Optional<AdminAlert> existing = alertRepository.findFirstByCategoryAndAcknowledgedFalseOrderByCreatedAtDesc(category);
        if (existing.isPresent()) return List.of();

        List<AdminAlert> alerts = new ArrayList<>();

        if (currentValue < threshold) {
            alerts.add(AdminAlert.builder()
                    .level(AlertLevel.WARNING)
                    .category(category)
                    .title("🟡 " + title)
                    .message(currentValue + " " + description)
                    .currentValue(currentValue)
                    .thresholdValue(threshold)
                    .build());
        }

        return alerts;
    }

    /**
     * Broadcast alerts to connected admins via WebSocket.
     */
    private void broadcastAlerts(List<AdminAlert> alerts) {
        List<AdminAlertResponse> responses = alerts.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "ADMIN_ALERT");
        payload.put("alerts", responses);
        payload.put("timestamp", System.currentTimeMillis());

        // Broadcast to /topic/admin-alerts
        wsController.broadcastToAdmins(
            com.retrouvit.dto.NotificationWsMessage.builder()
                .type("ADMIN_ALERT")
                .title("Alerte admin")
                .description(responses.size() + " nouvelle(s) alerte(s)")
                .timestamp(System.currentTimeMillis())
                .build()
        );
    }

    // ─── Public methods ────────────────────────────────────────────

    public List<AdminAlertResponse> getActiveAlerts() {
        return alertRepository.findByAcknowledgedFalseOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<AdminAlertResponse> getAllAlerts() {
        return alertRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public AdminAlertResponse acknowledgeAlert(Long id) {
        AdminAlert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alert not found: " + id));
        alert.setAcknowledged(true);
        alert.setAcknowledgedAt(LocalDateTime.now());
        return toResponse(alertRepository.save(alert));
    }

    public Map<String, Long> getAlertStats() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("total", alertRepository.count());
        stats.put("active", alertRepository.countByAcknowledgedFalse());
        stats.put("critical", (long) alertRepository.findByLevelAndAcknowledgedFalse(AlertLevel.CRITICAL).size());
        stats.put("warning", (long) alertRepository.findByLevelAndAcknowledgedFalse(AlertLevel.WARNING).size());
        return stats;
    }

    private AdminAlertResponse toResponse(AdminAlert alert) {
        return AdminAlertResponse.builder()
                .id(alert.getId())
                .level(alert.getLevel())
                .category(alert.getCategory())
                .title(alert.getTitle())
                .message(alert.getMessage())
                .currentValue(alert.getCurrentValue())
                .thresholdValue(alert.getThresholdValue())
                .acknowledged(alert.isAcknowledged())
                .acknowledgedAt(alert.getAcknowledgedAt())
                .createdAt(alert.getCreatedAt())
                .build();
    }
}
