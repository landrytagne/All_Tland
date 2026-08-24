package com.retrouvit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EscrowResponse {
    private Long id;
    private String reference;
    private LostObjectResponse lostObject;
    private FoundObjectResponse foundObject;
    private UserResponse buyer;
    private UserResponse seller;
    private Long amount;
    private String status;
    private LocalDate deadline;
    private Integer daysLeft;
    private Integer progress;
    private String location;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
}
