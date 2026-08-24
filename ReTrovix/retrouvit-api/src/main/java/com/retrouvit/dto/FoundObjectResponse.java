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
public class FoundObjectResponse {
    private Long id;
    private String title;
    private String description;
    private String category;
    private String location;
    private String city;
    private LocalDate dateFound;
    private String image;
    private String images;
    private String status;
    private Integer views;
    private UserResponse user;
    private LocalDateTime createdAt;
}
