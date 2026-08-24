package com.retrouvit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationResponse {
    private Long id;
    private UserResponse participant;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private Integer unread;
    private List<MessageResponse> messages;
    /** PENDING, ACTIVE, or REJECTED */
    private String status;
    /** true if current user is the one who needs to accept */
    private Boolean pendingForMe;
    /** id of the user who initiated this conversation */
    private Long createdByUserId;
}
