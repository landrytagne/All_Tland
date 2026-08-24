package com.retrouvit.service;

import com.retrouvit.controller.WebSocketNotificationController;
import com.retrouvit.dto.NotificationResponse;
import com.retrouvit.dto.NotificationWsMessage;
import com.retrouvit.entity.Notification;
import com.retrouvit.entity.NotificationType;
import com.retrouvit.entity.User;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.NotificationRepository;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final WebSocketNotificationController wsNotificationController;

    public List<NotificationResponse> getNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<NotificationResponse> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndReadOrderByCreatedAtDesc(userId, false).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<NotificationResponse> getNotificationsByType(Long userId, NotificationType type) {
        return notificationRepository.findByUserIdAndTypeOrderByCreatedAtDesc(userId, type).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification non trouvée"));
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndReadOrderByCreatedAtDesc(userId, false);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    @Transactional
    public void createNotification(Long userId, NotificationType type, String title, String description) {
        createNotification(userId, type, title, description, null);
    }

    @Transactional
    public void createNotification(Long userId, NotificationType type, String title, String description, Long conversationId) {
        createNotification(userId, type, title, description, conversationId, null);
    }

    @Transactional
    public void createNotification(Long userId, NotificationType type, String title, String description, Long conversationId, Long createdByUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .description(description)
                .conversationId(conversationId)
                .createdByUserId(createdByUserId)
                .build();

        Notification saved = notificationRepository.save(notification);

        // Send real-time WebSocket notification
        NotificationWsMessage wsMessage = NotificationWsMessage.builder()
                .type(type.name())
                .id(saved.getId())
                .title(title)
                .description(description)
                .conversationId(conversationId)
                .createdByUserId(createdByUserId)
                .timestamp(System.currentTimeMillis())
                .build();

        wsNotificationController.sendNotificationToUser(userId, wsMessage);
    }

    @Transactional
    public void createMatchNotification(Long userId, Long matchId, int matchScore, String lostTitle, String foundTitle) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        String title = "Nouvelle correspondance trouvée !";
        String description = "Votre objet '" + lostTitle + "' correspond avec '" + foundTitle + "' (Score: " + matchScore + "%)";

        Notification notification = Notification.builder()
                .user(user)
                .type(NotificationType.MATCH)
                .title(title)
                .description(description)
                .build();

        Notification saved = notificationRepository.save(notification);

        // Send match-specific WebSocket notification
        NotificationWsMessage wsMessage = NotificationWsMessage.builder()
                .type("MATCH")
                .id(saved.getId())
                .title(title)
                .description(description)
                .matchId(matchId)
                .matchScore(matchScore)
                .objectTitle(lostTitle)
                .timestamp(System.currentTimeMillis())
                .build();

        wsNotificationController.sendMatchToUser(userId, wsMessage);
    }

    private NotificationResponse toResponse(Notification notif) {
        return NotificationResponse.builder()
                .id(notif.getId())
                .type(notif.getType().name())
                .title(notif.getTitle())
                .description(notif.getDescription())
                .read(notif.getRead())
                .createdAt(notif.getCreatedAt())
                .conversationId(notif.getConversationId())
                .createdByUserId(notif.getCreatedByUserId())
                .build();
    }
}
