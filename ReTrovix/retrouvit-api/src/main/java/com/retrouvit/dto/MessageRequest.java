package com.retrouvit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageRequest {
    private String content;
    private String imageUrl;
    private String audioUrl;
    private Long replyToId;
}
