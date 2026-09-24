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
public class CityResponse {
    private Long id;
    private String name;
    private String region;
    private Boolean enabled;
    private Long objectCount;
    private LocalDateTime createdAt;
}
