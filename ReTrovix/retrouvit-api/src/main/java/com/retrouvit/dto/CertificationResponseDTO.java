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
public class CertificationResponseDTO {
    private Long id;
    private Long userId;
    private String userName;
    private String documentType;
    private String documentUrl;
    private String selfieUrl;
    private String status;
    private Boolean activeStatus;
    private Integer returnCountAtSubmission;
    private Integer trustScoreAtSubmission;
    private String rejectionReason;
    private String adminNotes;
    private Long reviewedBy;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
}
