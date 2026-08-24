package com.retrouvit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportRequest {
    private String type;
    private String subject;
    private String description;
    private Long reportedUserId;
    private Long lostObjectId;
    private Long foundObjectId;
    private Long relatedTransaction;
    private Long amount;
}
