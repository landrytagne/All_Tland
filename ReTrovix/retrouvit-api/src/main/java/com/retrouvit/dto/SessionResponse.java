package com.retrouvit.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Session/appareil actif d'un utilisateur (cahier des charges §5.1).
 * Le refresh token n'est jamais exposé — seules ses métadonnées.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Session/appareil actif d'un utilisateur")
public class SessionResponse {

    @Schema(description = "Identifiant technique de la session")
    private Long id;

    @Schema(description = "Appareil/navigateur d'origine (User-Agent tronqué)", example = "Chrome/120 (Linux)")
    private String deviceInfo;

    @Schema(description = "Adresse IP d'origine de la session", example = "41.202.219.7")
    private String ipAddress;

    @Schema(description = "Date de création de la session")
    private LocalDateTime createdAt;

    @Schema(description = "Date d'expiration du refresh token sous-jacent")
    private LocalDateTime expiresAt;

    @Schema(description = "Session actuellement utilisée par cet appel API")
    private Boolean current;

    @Schema(description = "Token expiré (session inactive)")
    @JsonProperty("expired")
    private Boolean expired;
}
