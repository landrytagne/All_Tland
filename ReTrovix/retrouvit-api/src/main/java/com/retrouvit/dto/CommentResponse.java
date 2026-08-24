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
public class CommentResponse {
    private Long id;
    private String content;
    private UserResponse user;
    private Long lostObjectId;
    private Long foundObjectId;
    private Long parentId;
    private Boolean deleted;
    private List<CommentResponse> replies;
    private int replyCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
