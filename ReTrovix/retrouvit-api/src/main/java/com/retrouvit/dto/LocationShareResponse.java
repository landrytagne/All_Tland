package com.retrouvit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Réponse du partage de position — §13.
 * {@code sharingActive=false} signifie : position masquée
 * (mission non démarrée, ou restitution terminée §20).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationShareResponse {

    private Long returnRequestId;

    /** Utilisateur dont la position est renvoyée. */
    private UserResponse user;

    private Double latitude;
    private Double longitude;
    private Double accuracyMeters;

    /** Dernière mise à jour de la position. */
    private LocalDateTime updatedAt;

    /**
     * true : mission en cours, position visible ;
     * false : position masquée (avant mission / après restitution §20).
     */
    private boolean sharingActive;
}
