package com.retrouvit.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {
    private Long id;
    private String name;
    private String token;
    private String refreshToken;
    private Long expiresIn;     // access token TTL in seconds
    private String email;
    private String role;

    // ─── 2FA (CDC §5.1) — renseignés uniquement quand un OTP est requis ───
    /** true : un code a été envoyé, l'utilisateur doit le saisir avant d'obtenir les tokens. */
    private Boolean otpRequired;
    /** Email masqué pour l'affichage (j***e@gmail.com). */
    private String maskedEmail;
    /** Message utilisateur. */
    private String message;
}
