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
public class LostObjectResponse {
    private Long id;
    private String title;
    private String description;
    private String category;
    private String location;
    private String city;
    private LocalDate dateLost;
    private String image;
    private String images;
    private String status;
    private Long reward;
    private Integer views;
    private UserResponse user;
    private LocalDateTime createdAt;
}
