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
public class RatingResponse {
    private Long id;
    private Long returnRequestId;
    private UserResponse rater;
    private UserResponse rated;
    private Integer stars;
    private String comment;
    private LocalDateTime createdAt;
    private Double averageRating;
    private Long ratingCount;
}
