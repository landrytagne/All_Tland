package com.retrouvit.dto;

import com.retrouvit.entity.AlertLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Requête pour modifier un seuil d'alerte")
public class AlertThresholdRequest {

    @Schema(description = "Valeur du seuil", example = "10", requiredMode = Schema.RequiredMode.REQUIRED)
    @Min(value = 0, message = "Le seuil doit être >= 0")
    private long value;

    @Schema(description = "Seuil activé/désactivé", example = "true")
    private Boolean enabled;

    @Schema(description = "Description du seuil", example = "Nombre de signalements en attente")
    private String description;
}
