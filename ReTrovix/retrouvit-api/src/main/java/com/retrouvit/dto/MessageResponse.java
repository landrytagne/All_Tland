package com.retrouvit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageResponse {
    private Long id;
    private Long senderId;
    private String senderName;
    private String senderAvatar;
    private String content;
    private String imageUrl;
    private String audioUrl;
    private Long replyToId;
    private String replyToContent;
    private String replyToSenderName;
    private Boolean read;
    private Boolean deleted;
    private LocalDateTime createdAt;
}
