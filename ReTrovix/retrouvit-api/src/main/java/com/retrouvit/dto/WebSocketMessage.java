package com.retrouvit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebSocketMessage {
    private String type;        // "CHAT", "IMAGE", "TYPING", "READ", "ONLINE", "OFFLINE"
    private Long conversationId;
    private Long senderId;
    private String senderName;
    private String senderAvatar;
    private String content;
    private String imageUrl;
    private String audioUrl;
    private Long messageId;
    private Long replyToId;
    private String replyToContent;
    private String replyToSenderName;
    private Boolean deleted;
    private String timestamp;
}
