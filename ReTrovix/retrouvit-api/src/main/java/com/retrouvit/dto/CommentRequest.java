package com.retrouvit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentRequest {
    private String content;
    private Long lostObjectId;
    private Long foundObjectId;
    private Long parentId; // for replies
}
