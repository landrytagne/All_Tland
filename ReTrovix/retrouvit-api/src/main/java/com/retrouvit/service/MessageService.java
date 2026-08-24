package com.retrouvit.service;

import com.retrouvit.dto.ConversationResponse;
import com.retrouvit.dto.MessageResponse;
import com.retrouvit.dto.UserResponse;
import com.retrouvit.entity.Conversation;
import com.retrouvit.entity.ConversationStatus;
import com.retrouvit.entity.Message;
import com.retrouvit.entity.NotificationType;
import com.retrouvit.entity.User;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.ConversationRepository;
import com.retrouvit.repository.MessageRepository;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public List<ConversationResponse> getConversations(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        return conversationRepository.findByUser1OrUser2OrderByLastMessageAtDesc(user, user).stream()
                .map(conv -> toConversationResponse(conv, userId))
                .collect(Collectors.toList());
    }

    public int getTotalUnreadMessageCount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        return conversationRepository.findByUser1OrUser2OrderByLastMessageAtDesc(user, user).stream()
                .mapToInt(Conversation::getUnreadCount)
                .sum();
    }

    public ConversationResponse getConversation(Long conversationId, Long userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation non trouvée"));

        return toConversationResponse(conversation, userId);
    }

    public ConversationResponse getOrCreateConversation(Long user1Id, Long user2Id) {
        User user1 = userRepository.findById(user1Id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        User user2 = userRepository.findById(user2Id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        Conversation conversation = conversationRepository.findByUsers(user1, user2)
                .orElseGet(() -> {
                    // New conversation starts as PENDING — recipient must accept
                    Conversation newConv = Conversation.builder()
                            .user1(user1)
                            .user2(user2)
                            .status(ConversationStatus.PENDING)
                            .createdBy(user1)
                            .build();
                    Conversation saved = conversationRepository.save(newConv);

                    // Send notification to recipient (user2) — include creator ID so frontend can hide Accept/Reject for creator
                    try {
                        notificationService.createNotification(
                                user2.getId(),
                                NotificationType.CONVERSATION_REQUEST,
                                "Nouvelle demande de discussion",
                                user1.getName() + " souhaite discuter avec vous. Cliquez pour accepter ou refuser.",
                                saved.getId(),
                                user1.getId()
                        );
                        log.info("Conversation request notification sent to user {} from user {}", user2.getId(), user1.getId());
                    } catch (Exception e) {
                        log.error("Failed to send conversation request notification: {}", e.getMessage());
                    }

                    return saved;
                });

        return toConversationResponse(conversation, user1Id);
    }

    /**
     * Create (or get existing) conversation and send the first message.
     * The first message is allowed even in PENDING status for the conversation creator.
     * The notification includes the first message + object info.
     */
    @Transactional
    public ConversationResponse getOrCreateConversationWithMessage(
            Long user1Id, Long user2Id, String firstMessage,
            String objectTitle, String objectType, Long objectId) {

        User user1 = userRepository.findById(user1Id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        User user2 = userRepository.findById(user2Id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        boolean isNew = conversationRepository.findByUsers(user1, user2).isEmpty();

        Conversation conversation = conversationRepository.findByUsers(user1, user2)
                .orElseGet(() -> {
                    Conversation newConv = Conversation.builder()
                            .user1(user1)
                            .user2(user2)
                            .status(ConversationStatus.PENDING)
                            .createdBy(user1)
                            .build();
                    return conversationRepository.save(newConv);
                });

        // Send first message if new conversation
        if (isNew && firstMessage != null && !firstMessage.isBlank()) {
            Message message = Message.builder()
                    .conversation(conversation)
                    .sender(user1)
                    .content(firstMessage)
                    .build();
            messageRepository.save(message);

            conversation.setLastMessage(firstMessage);
            conversation.setLastMessageAt(LocalDateTime.now());
            conversation.setUnreadCount(1);
            conversationRepository.save(conversation);

            // Detailed notification to recipient
            String objLabel = objectType != null ? objectType : "objet";
            String title = "💬 Nouvelle demande de discussion";
            String description = user1.getName()
                    + " souhaite discuter à propos de \"" + (objectTitle != null ? objectTitle : objLabel) + "\". "
                    + "Premier message : \"" + (firstMessage.length() > 120 ? firstMessage.substring(0, 120) + "..." : firstMessage) + "\"";

            notificationService.createNotification(
                    user2.getId(),
                    NotificationType.CONVERSATION_REQUEST,
                    title,
                    description,
                    conversation.getId(),
                    user1.getId()
            );
            log.info("Conversation + first message created. Notif sent to user {}", user2.getId());
        } else if (isNew) {
            // No message — fallback to old behavior
            notificationService.createNotification(
                    user2.getId(),
                    NotificationType.CONVERSATION_REQUEST,
                    "Nouvelle demande de discussion",
                    user1.getName() + " souhaite discuter avec vous. Cliquez pour accepter ou refuser.",
                    conversation.getId()
            );
        }

        return toConversationResponse(conversation, user1Id);
    }

    @Transactional
    public ConversationResponse acceptConversation(Long conversationId, Long userId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation non trouvée"));

        // Only PENDING conversations can be accepted
        if (conv.getStatus() != ConversationStatus.PENDING) {
            throw new IllegalStateException("Cette conversation n'est pas en attente d'acceptation");
        }

        // Only the non-creator can accept
        if (conv.getCreatedBy() != null && conv.getCreatedBy().getId().equals(userId)) {
            throw new IllegalStateException("Vous ne pouvez pas accepter votre propre demande");
        }

        conv.setStatus(ConversationStatus.ACTIVE);
        conversationRepository.save(conv);

        return toConversationResponse(conv, userId);
    }

    @Transactional
    public ConversationResponse rejectConversation(Long conversationId, Long userId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation non trouvée"));

        // Only PENDING conversations can be rejected
        if (conv.getStatus() != ConversationStatus.PENDING) {
            throw new IllegalStateException("Cette conversation n'est pas en attente de refus");
        }

        if (conv.getCreatedBy() != null && conv.getCreatedBy().getId().equals(userId)) {
            throw new IllegalStateException("Vous ne pouvez pas rejeter votre propre demande");
        }

        conv.setStatus(ConversationStatus.REJECTED);
        conversationRepository.save(conv);

        return toConversationResponse(conv, userId);
    }

    @Transactional
    public MessageResponse sendMessage(Long conversationId, Long senderId, String content) {
        return sendMessage(conversationId, senderId, content, null, null);
    }

    @Transactional
    public MessageResponse sendMessage(Long conversationId, Long senderId, String content, String imageUrl) {
        return sendMessage(conversationId, senderId, content, imageUrl, null);
    }

    @Transactional
    public MessageResponse sendMessage(Long conversationId, Long senderId, String content, String imageUrl, String audioUrl) {
        return sendMessage(conversationId, senderId, content, imageUrl, audioUrl, null);
    }

    @Transactional
    public MessageResponse sendMessage(Long conversationId, Long senderId, String content, String imageUrl, String audioUrl, Long replyToId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation non trouvée"));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        if (conversation.getStatus() == ConversationStatus.PENDING) {
            throw new IllegalStateException("Cette conversation n'est pas encore active. En attente d'acceptation.");
        }
        if (conversation.getStatus() == ConversationStatus.REJECTED) {
            throw new IllegalStateException("Cette conversation a été refusée. Impossible d'envoyer des messages.");
        }

        Message.MessageBuilder builder = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .content(content)
                .imageUrl(imageUrl)
                .audioUrl(audioUrl);

        if (replyToId != null) {
            Message replyToMessage = messageRepository.findById(replyToId)
                    .orElseThrow(() -> new ResourceNotFoundException("Message à répondre non trouvé"));
            builder.replyTo(replyToMessage);
        }

        Message saved = messageRepository.save(builder.build());

        String preview;
        if (audioUrl != null) {
            preview = "\ud83c\udfa4 Message vocal";
        } else if (imageUrl != null && (content == null || content.isBlank())) {
            preview = "\ud83d\udcf7 Image";
        } else if (content != null && !content.isBlank()) {
            preview = content;
        } else {
            preview = "Image";
        }
        conversation.setLastMessage(preview);
        conversation.setLastMessageAt(LocalDateTime.now());
        conversation.setUnreadCount(conversation.getUnreadCount() + 1);
        conversationRepository.save(conversation);

        return toMessageResponse(saved);
    }

    @Transactional
    public MessageResponse editMessage(Long messageId, Long userId, String newContent) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message non trouvé"));
        if (!message.getSender().getId().equals(userId)) {
            throw new IllegalStateException("Vous ne pouvez modifier que vos propres messages");
        }
        message.setContent(newContent);
        messageRepository.save(message);

        // Update conversation preview if this was the last message
        Conversation conv = message.getConversation();
        if (conv.getLastMessage() != null && conv.getLastMessage().equals(message.getContent())) {
            conv.setLastMessage(newContent);
            conversationRepository.save(conv);
        }

        return toMessageResponse(message);
    }

    @Transactional
    public void deleteMessage(Long messageId, Long userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message non trouvé"));
        if (!message.getSender().getId().equals(userId)) {
            throw new IllegalStateException("Vous ne pouvez supprimer que vos propres messages");
        }
        message.setDeleted(true);
        message.setContent(null);
        message.setImageUrl(null);
        message.setAudioUrl(null);
        messageRepository.save(message);
    }

    @Transactional
    public void markAsRead(Long conversationId, Long userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation non trouvée"));

        List<Message> unreadMessages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .filter(m -> !m.getRead() && !m.getSender().getId().equals(userId))
                .collect(Collectors.toList());

        unreadMessages.forEach(m -> m.setRead(true));
        messageRepository.saveAll(unreadMessages);

        conversation.setUnreadCount(0);
        conversationRepository.save(conversation);
    }

    /**
     * Get messages after a given message ID (for HTTP polling fallback).
     */
    public List<MessageResponse> getMessagesAfter(Long conversationId, Long afterMessageId, Long userId) {
        // Verify user is part of conversation
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation non trouvée"));

        if (!conv.getUser1().getId().equals(userId) && !conv.getUser2().getId().equals(userId)) {
            throw new IllegalStateException("Vous n'avez pas accès à cette conversation");
        }

        List<Message> allMessages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);

        return allMessages.stream()
                .filter(m -> afterMessageId == null || afterMessageId == 0 || m.getId() > afterMessageId)
                .map(this::toMessageResponse)
                .collect(Collectors.toList());
    }

    private ConversationResponse toConversationResponse(Conversation conv, Long currentUserId) {
        User otherUser = conv.getUser1().getId().equals(currentUserId)
                ? conv.getUser2() : conv.getUser1();

        List<MessageResponse> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conv.getId())
                .stream()
                .map(this::toMessageResponse)
                .collect(Collectors.toList());

        boolean pendingForMe = conv.getStatus() == ConversationStatus.PENDING
                && conv.getCreatedBy() != null
                && !conv.getCreatedBy().getId().equals(currentUserId);

        return ConversationResponse.builder()
                .id(conv.getId())
                .participant(toUserResponse(otherUser))
                .lastMessage(conv.getLastMessage())
                .lastMessageAt(conv.getLastMessageAt())
                .unread(conv.getUnreadCount())
                .messages(messages)
                .status(conv.getStatus() != null ? conv.getStatus().name() : "ACTIVE")
                .pendingForMe(pendingForMe)
                .createdByUserId(conv.getCreatedBy() != null ? conv.getCreatedBy().getId() : null)
                .build();
    }

    private MessageResponse toMessageResponse(Message m) {
        MessageResponse.MessageResponseBuilder builder = MessageResponse.builder()
                .id(m.getId())
                .senderId(m.getSender().getId())
                .senderName(m.getSender().getName())
                .senderAvatar(m.getSender().getAvatar())
                .content(m.getContent())
                .imageUrl(m.getImageUrl())
                .audioUrl(m.getAudioUrl())
                .deleted(m.getDeleted())
                .read(m.getRead())
                .createdAt(m.getCreatedAt());

        if (m.getReplyTo() != null) {
            builder.replyToId(m.getReplyTo().getId())
                    .replyToContent(m.getReplyTo().getContent())
                    .replyToSenderName(m.getReplyTo().getSender().getName());
        }

        return builder.build();
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .phone(user.getPhone())
                .location(user.getLocation())
                .avatar(user.getAvatar())
                .trustScore(user.getTrustScore())
                .verified(user.getVerified())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
