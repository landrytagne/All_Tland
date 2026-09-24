package com.retrouvit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Réponse d'initiation OTP : indique au frontend vers où rediriger
 * l'utilisateur et masque l'email de destination.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Réponse d'initiation de la 2FA par OTP email")
public class OtpInitResponse {

    @Schema(description = "Email destinataire masqué", example = "j***e@gmail.com")
    private String maskedEmail;

    @Schema(description = "Un code a été envoyé — rediriger vers la vérification OTP")
    private Boolean otpRequired;

    @Schema(description = "Message utilisateur")
    private String message;
}
