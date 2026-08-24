package com.retrouvit.controller;

import com.retrouvit.dto.ConversationResponse;
import com.retrouvit.dto.MessageRequest;
import com.retrouvit.dto.MessageResponse;
import com.retrouvit.dto.WebSocketMessage;
import com.retrouvit.entity.User;
import com.retrouvit.service.MessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
@Tag(name = "Conversations", description = "API de gestion des conversations et messages")
public class MessageController {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping
    @Operation(summary = "Obtenir les conversations de l'utilisateur")
    public ResponseEntity<List<ConversationResponse>> getConversations(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(messageService.getConversations(user.getId()));
    }

    @GetMapping("/unread/count")
    @Operation(summary = "Nombre total de messages non lus")
    public ResponseEntity<java.util.Map<String, Integer>> getUnreadMessageCount(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        int count = messageService.getTotalUnreadMessageCount(user.getId());
        return ResponseEntity.ok(java.util.Map.of("count", count));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir une conversation par ID")
    public ResponseEntity<ConversationResponse> getConversation(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(messageService.getConversation(id, user.getId()));
    }

    @GetMapping("/with/{otherUserId}")
    @Operation(summary = "Obtenir ou créer une conversation avec un utilisateur")
    public ResponseEntity<ConversationResponse> getOrCreateConversation(
            @PathVariable Long otherUserId,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(messageService.getOrCreateConversation(user.getId(), otherUserId));
    }

    @PostMapping("/with/{otherUserId}/message")
    @Operation(summary = "Créer une conversation avec un premier message")
    public ResponseEntity<ConversationResponse> getOrCreateWithMessage(
            @PathVariable Long otherUserId,
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        String message = body.getOrDefault("message", "");
        String objectTitle = body.get("objectTitle");
        String objectType = body.get("objectType");
        String objectIdStr = body.get("objectId");
        Long objectId = objectIdStr != null ? Long.parseLong(objectIdStr) : null;

        ConversationResponse response = messageService.getOrCreateConversationWithMessage(
                user.getId(), otherUserId, message, objectTitle, objectType, objectId
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{conversationId}/messages")
    @Operation(summary = "Envoyer un message dans une conversation")
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable Long conversationId,
            @Valid @RequestBody MessageRequest request,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        MessageResponse response = messageService.sendMessage(
                conversationId, user.getId(), request.getContent(),
                request.getImageUrl(), request.getAudioUrl(), request.getReplyToId());

        // Broadcast via WebSocket so the other user receives it in real-time
        try {
            String msgType = "CHAT";
            if (response.getAudioUrl() != null) msgType = "AUDIO";
            else if (response.getImageUrl() != null) msgType = "IMAGE";

            WebSocketMessage wsMessage = WebSocketMessage.builder()
                    .type(msgType)
                    .conversationId(conversationId)
                    .senderId(user.getId())
                    .senderName(user.getName())
                    .senderAvatar(user.getAvatar())
                    .content(response.getContent())
                    .imageUrl(response.getImageUrl())
                    .audioUrl(response.getAudioUrl())
                    .messageId(response.getId())
                    .replyToId(response.getReplyToId())
                    .replyToContent(response.getReplyToContent())
                    .replyToSenderName(response.getReplyToSenderName())
                    .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .build();
            messagingTemplate.convertAndSend("/topic/conversation/" + conversationId, wsMessage);
            log.info("REST message broadcast to WS topic/conversation/{}", conversationId);
        } catch (Exception e) {
            log.error("Failed to broadcast message via WS: {}", e.getMessage());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{conversationId}/messages/{messageId}")
    @Operation(summary = "Modifier un message")
    public ResponseEntity<MessageResponse> editMessage(
            @PathVariable Long conversationId,
            @PathVariable Long messageId,
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        String newContent = body.get("content");
        if (newContent == null || newContent.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        MessageResponse response = messageService.editMessage(messageId, user.getId(), newContent);

        // Broadcast edit via WebSocket
        try {
            WebSocketMessage wsMessage = WebSocketMessage.builder()
                    .type("EDIT")
                    .conversationId(conversationId)
                    .senderId(user.getId())
                    .senderName(user.getName())
                    .messageId(messageId)
                    .content(newContent)
                    .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .build();
            messagingTemplate.convertAndSend("/topic/conversation/" + conversationId, wsMessage);
        } catch (Exception e) {
            log.error("Failed to broadcast edit via WS: {}", e.getMessage());
        }

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{conversationId}/messages/{messageId}")
    @Operation(summary = "Supprimer un message")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable Long conversationId,
            @PathVariable Long messageId,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        messageService.deleteMessage(messageId, user.getId());

        // Broadcast deletion via WebSocket
        try {
            WebSocketMessage wsMessage = WebSocketMessage.builder()
                    .type("DELETE")
                    .conversationId(conversationId)
                    .senderId(user.getId())
                    .messageId(messageId)
                    .deleted(true)
                    .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .build();
            messagingTemplate.convertAndSend("/topic/conversation/" + conversationId, wsMessage);
        } catch (Exception e) {
            log.error("Failed to broadcast delete via WS: {}", e.getMessage());
        }

        return ResponseEntity.ok().build();
    }

    @PutMapping("/{conversationId}/read")
    @Operation(summary = "Marquer les messages comme lus")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long conversationId,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        messageService.markAsRead(conversationId, user.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{conversationId}/messages/poll")
    @Operation(summary = "Poller les nouveaux messages (fallback HTTP)")
    public ResponseEntity<List<MessageResponse>> pollMessages(
            @PathVariable Long conversationId,
            @RequestParam(required = false, defaultValue = "0") Long afterMessageId,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        List<MessageResponse> messages = messageService.getMessagesAfter(conversationId, afterMessageId, user.getId());
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/{conversationId}/accept")
    @Operation(summary = "Accepter une demande de discussion")
    public ResponseEntity<ConversationResponse> acceptConversation(
            @PathVariable Long conversationId,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(messageService.acceptConversation(conversationId, user.getId()));
    }

    @PostMapping("/{conversationId}/reject")
    @Operation(summary = "Rejeter une demande de discussion")
    public ResponseEntity<ConversationResponse> rejectConversation(
            @PathVariable Long conversationId,
            Authentication authentication
    ) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(messageService.rejectConversation(conversationId, user.getId()));
    }
}
