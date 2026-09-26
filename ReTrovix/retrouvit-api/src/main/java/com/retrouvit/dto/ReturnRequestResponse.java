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
public class ReturnRequestResponse {
    private Long id;
    private String reference;
    private Long lostObjectId;
    private String lostObjectTitle;
    private Long foundObjectId;
    private String foundObjectTitle;
    private UserResponse loser;
    private UserResponse finder;
    private Long proposedAmount;
    private Long acceptedAmount;
    private Integer platformFeePct;
    private String status;
    /** Échecs de vérification de propriété (§2 — blocage après 5). */
    private Integer verificationAttempts;
    private Boolean loserValidated;
    private Boolean finderValidated;
    private Boolean loserReturnConfirmed;
    private Boolean finderReturnConfirmed;
    private LocalDateTime meetingDate;
    private String meetingLocation;
    private Double meetingLat;
    private Double meetingLng;
    private String disputeReason;
    private Boolean disputeResolved;
    private Long paymentAmount;
    private Long platformFee;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
    private Boolean hasRating;
}
