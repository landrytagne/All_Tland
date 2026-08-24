package com.retrouvit.service;

import com.retrouvit.controller.WebSocketNotificationController;
import com.retrouvit.dto.NotificationWsMessage;
import com.retrouvit.entity.*;
import com.retrouvit.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminStatsService {

    private final UserRepository userRepository;
    private final LostObjectRepository lostObjectRepository;
    private final FoundObjectRepository foundObjectRepository;
    private final MatchRepository matchRepository;
    private final ReportRepository reportRepository;
    private final NotificationRepository notificationRepository;
    private final WebSocketNotificationController wsNotificationController;

    /**
     * Get current admin dashboard statistics.
     */
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();

        // Users
        long totalUsers = userRepository.count();
        long todayStart = java.time.LocalDate.now().atStartOfDay(java.time.ZoneOffset.UTC).toInstant().toEpochMilli();
        stats.put("totalUsers", totalUsers);

        // Objects
        long totalLostObjects = lostObjectRepository.count();
        long activeLostObjects = lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE).size();
        long totalFoundObjects = foundObjectRepository.count();
        long activeFoundObjects = foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE).size();
        stats.put("totalLostObjects", totalLostObjects);
        stats.put("activeLostObjects", activeLostObjects);
        stats.put("totalFoundObjects", totalFoundObjects);
        stats.put("activeFoundObjects", activeFoundObjects);

        // Matches
        long totalMatches = matchRepository.count();
        stats.put("totalMatches", totalMatches);

        // Reports
        long totalReports = reportRepository.count();
        long pendingReports = reportRepository.countByStatus(ReportStatus.PENDING);
        long escalatedReports = reportRepository.countByStatus(ReportStatus.ESCALATED);
        stats.put("totalReports", totalReports);
        stats.put("pendingReports", pendingReports);
        stats.put("escalatedReports", escalatedReports);

        // Timestamp
        stats.put("timestamp", System.currentTimeMillis());

        return stats;
    }

    /**
     * Broadcast stats to connected admins via WebSocket.
     * Runs every 10 seconds.
     */
    @Scheduled(fixedRate = 10000)
    public void broadcastStats() {
        try {
            Map<String, Object> stats = getStats();

            NotificationWsMessage message = NotificationWsMessage.builder()
                    .type("ADMIN_STATS")
                    .title("Dashboard Stats")
                    .description(stats.toString())
                    .timestamp(System.currentTimeMillis())
                    .build();

            // Broadcast to /topic/admin-stats
            wsNotificationController.broadcastAdminStats(stats);
        } catch (Exception e) {
            log.error("Failed to broadcast admin stats: {}", e.getMessage());
        }
    }
}
