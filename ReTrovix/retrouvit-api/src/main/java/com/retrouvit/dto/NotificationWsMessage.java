package com.retrouvit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationWsMessage {
    private String type;           // "MATCH", "NOTIFICATION", "READ_ALL"
    private Long id;               // notification or match ID
    private String title;
    private String description;
    private Long matchId;
    private Integer matchScore;
    private String objectTitle;
    private Long conversationId;
    private Long createdByUserId;
    private Long timestamp;
}
