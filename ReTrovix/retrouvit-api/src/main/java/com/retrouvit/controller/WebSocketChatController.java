package com.retrouvit.controller;

import com.retrouvit.dto.MessageResponse;
import com.retrouvit.dto.WebSocketMessage;
import com.retrouvit.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * WebSocket controller for real-time chat via STOMP.
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocketChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;

    /**
     * Send a text or image chat message.
     * Client sends to: /app/chat/{conversationId}
     */
    @MessageMapping("/chat/{conversationId}")
    public void sendMessage(
            @DestinationVariable Long conversationId,
            @Payload Map<String, String> payload,
            Principal principal) {

        String content = payload.get("content");
        String imageUrl = payload.get("imageUrl");
        Long senderId = extractUserId(principal);
        String senderName = principal != null ? principal.getName() : "Unknown";

        if (senderId == null) {
            log.warn("Invalid WebSocket message: no senderId");
            return;
        }

        if ((content == null || content.isBlank()) && (imageUrl == null || imageUrl.isBlank())) {
            log.warn("Empty message from user {}", senderId);
            return;
        }

        log.info("WS message from user {} in conversation {}: text={}, image={}",
                senderId, conversationId, content, imageUrl);

        // Persist message via existing REST service
        MessageResponse saved = messageService.sendMessage(conversationId, senderId, content, imageUrl);

        // Determine message type
        String messageType = (imageUrl != null && !imageUrl.isBlank()) ? "IMAGE" : "CHAT";

        // Build and broadcast
        WebSocketMessage wsMessage = WebSocketMessage.builder()
                .type(messageType)
                .conversationId(conversationId)
                .senderId(senderId)
                .senderName(senderName)
                .senderAvatar(saved.getSenderAvatar())
                .content(content)
                .imageUrl(imageUrl)
                .messageId(saved.getId())
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();

        messagingTemplate.convertAndSend("/topic/conversation/" + conversationId, wsMessage);
    }

    /**
     * Typing indicator.
     */
    @MessageMapping("/chat/{conversationId}/typing")
    public void typingIndicator(
            @DestinationVariable Long conversationId,
            Principal principal) {

        Long senderId = extractUserId(principal);

        WebSocketMessage wsMessage = WebSocketMessage.builder()
                .type("TYPING")
                .conversationId(conversationId)
                .senderId(senderId)
                .senderName(principal != null ? principal.getName() : "Unknown")
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();

        messagingTemplate.convertAndSend("/topic/conversation/" + conversationId, wsMessage);
    }

    /**
     * Mark conversation as read.
     */
    @MessageMapping("/chat/{conversationId}/read")
    public void markAsRead(
            @DestinationVariable Long conversationId,
            Principal principal) {

        Long userId = extractUserId(principal);

        if (userId != null) {
            messageService.markAsRead(conversationId, userId);
        }

        WebSocketMessage wsMessage = WebSocketMessage.builder()
                .type("READ")
                .conversationId(conversationId)
                .senderId(userId)
                .senderName(principal != null ? principal.getName() : "Unknown")
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();

        messagingTemplate.convertAndSend("/topic/conversation/" + conversationId, wsMessage);
    }

    private Long extractUserId(Principal principal) {
        if (principal instanceof com.retrouvit.config.WebSocketUserPrincipal wsPrincipal) {
            return wsPrincipal.getUserId();
        }
        return null;
    }
}
