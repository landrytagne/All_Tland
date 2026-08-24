package com.retrouvit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Réponse de paiement")
public class PaymentResponse {

    @Schema(description = "ID du paiement")
    private Long id;

    @Schema(description = "Référence unique du paiement", example = "PAY-A1B2C3D4")
    private String reference;

    @Schema(description = "Fournisseur de paiement", example = "MTN_MOMO")
    private String provider;

    @Schema(description = "Méthode de paiement", example = "MOBILE_MONEY")
    private String method;

    @Schema(description = "Statut du paiement", example = "COMPLETED")
    private String status;

    @Schema(description = "Montant", example = "10000")
    private Long amount;

    @Schema(description = "Devise", example = "XAF")
    private String currency;

    @Schema(description = "Numéro de téléphone")
    private String phoneNumber;

    @Schema(description = "Référence externe du fournisseur")
    private String externalReference;

    @Schema(description="Raison de l'échec")
    private String failureReason;

    @Schema(description = "Date de complétion")
    private LocalDateTime completedAt;

    @Schema(description = "Date de création")
    private LocalDateTime createdAt;
}
