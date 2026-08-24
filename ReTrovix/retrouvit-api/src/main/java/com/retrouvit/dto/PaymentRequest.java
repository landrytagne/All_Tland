package com.retrouvit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Requête de paiement")
public class PaymentRequest {

    @Schema(description = "Fournisseur de paiement", example = "MTN_MOMO", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Le fournisseur de paiement est obligatoire")
    private String provider;

    @Schema(description = "Méthode de paiement", example = "MOBILE_MONEY", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "La méthode de paiement est obligatoire")
    private String method;

    @Schema(description = "Montant à déposer", example = "10000", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Le montant est obligatoire")
    @Positive(message = "Le montant doit être positif")
    private Long amount;

    @Schema(description = "Numéro de téléphone Mobile Money", example = "+237699123456")
    private String phoneNumber;
}
