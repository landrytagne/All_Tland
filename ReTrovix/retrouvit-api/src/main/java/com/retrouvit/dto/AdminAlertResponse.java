package com.retrouvit.dto;

import com.retrouvit.entity.AlertLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAlertResponse {

    private Long id;
    private AlertLevel level;
    private String category;
    private String title;
    private String message;
    private long currentValue;
    private long thresholdValue;
    private boolean acknowledged;
    private LocalDateTime acknowledgedAt;
    private LocalDateTime createdAt;
}
