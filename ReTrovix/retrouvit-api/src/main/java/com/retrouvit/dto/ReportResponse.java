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
public class ReportResponse {
    private Long id;
    private String type;
    private String status;
    private String subject;
    private String description;
    private UserResponse reporter;
    private UserResponse reported;
    private Long lostObjectId;
    private String lostObjectTitle;
    private Long foundObjectId;
    private String foundObjectTitle;
    private Long relatedTransaction;
    private Long amount;
    private String priority;
    private String resolution;
    private Long resolvedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
