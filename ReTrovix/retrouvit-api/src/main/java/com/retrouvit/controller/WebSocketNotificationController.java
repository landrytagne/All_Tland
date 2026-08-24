package com.retrouvit.controller;

import com.retrouvit.config.WebSocketUserPrincipal;
import com.retrouvit.dto.NotificationWsMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * WebSocket controller for broadcasting notifications and matches to users.
 *
 * Client subscribes to:
 *   - /user/queue/notifications  → private notifications for this user
 *   - /user/queue/matches        → private match alerts for this user
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationController {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Send a notification to a specific user.
     */
    public void sendNotificationToUser(Long userId, NotificationWsMessage message) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                "/queue/notifications",
                message
        );
        log.info("Notification sent to user {}: {}", userId, message.getType());
    }

    /**
     * Send a match alert to a specific user.
     */
    public void sendMatchToUser(Long userId, NotificationWsMessage message) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                "/queue/matches",
                message
        );
        log.info("Match alert sent to user {}: matchId={}", userId, message.getMatchId());
    }

    /**
     * Broadcast a notification to all connected admins.
     */
    public void broadcastToAdmins(NotificationWsMessage message) {
        messagingTemplate.convertAndSend("/topic/admin", message);
        log.info("Admin broadcast: {}", message.getType());
    }

    /**
     * Broadcast admin dashboard stats.
     */
    public void broadcastAdminStats(java.util.Map<String, Object> stats) {
        messagingTemplate.convertAndSend("/topic/admin-stats", stats);
    }
}
