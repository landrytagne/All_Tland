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
    /** Détail du score par critère (JSON : text, geography, temporal, visual) — CDC §4.3. */
    private String scoreBreakdown;
    /** true si score ≥ seuil « correspondance forte » (CDC §7.2 : ≥ 90 %). */
    private Boolean strongMatch;
    private String status;
    private UserResponse user;
    private LocalDateTime createdAt;
}
