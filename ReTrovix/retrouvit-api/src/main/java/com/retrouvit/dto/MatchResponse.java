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
public class MatchResponse {
    private Long id;
    private LostObjectResponse lostObject;
    private FoundObjectResponse foundObject;
    private Integer matchScore;
    private String status;
    private UserResponse user;
    private LocalDateTime createdAt;
}
