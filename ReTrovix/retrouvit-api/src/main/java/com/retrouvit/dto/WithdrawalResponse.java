package com.retrouvit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Demande de retrait du wallet (CDC §5.4)")
public class WithdrawalResponse {

    private Long id;

    @Schema(description = "Référence interne", example = "WD-3F8A21BC")
    private String reference;

    @Schema(description = "Montant en XAF")
    private Long amount;

    @Schema(description = "Méthode", example = "MTN_MOMO")
    private String method;

    private String phoneNumber;

    @Schema(description = "PENDING_REVIEW / PROCESSING / COMPLETED / FAILED / REJECTED")
    private String status;

    private String failureReason;

    private LocalDateTime createdAt;

    private LocalDateTime reviewedAt;
}
