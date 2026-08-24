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
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private String role;
    private String phone;
    private String location;
    private String avatar;
    private Integer trustScore;
    private Integer objectsFound;
    private Integer objectsLost;
    private Integer matches;
    private Boolean verified;
    private Long walletBalance;
    private Boolean banned;
    private String banReason;
    private LocalDateTime bannedAt;
    private LocalDateTime createdAt;
}
