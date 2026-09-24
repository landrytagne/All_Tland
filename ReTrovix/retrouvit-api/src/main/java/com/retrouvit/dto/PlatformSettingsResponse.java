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
public class PlatformSettingsResponse {
    private Long id;
    private String settingKey;
    private String settingValue;
    private String settingType;
    private String description;
    private LocalDateTime updatedAt;
}
