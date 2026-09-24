// ─── OTP 2FA (CDC §5.1 / §6.1) ──────────────────────────────────────
import { apiRequest } from "./api-core";
import type { LoginResponse } from "./api-admin";

export interface OtpRequestResponse {
  maskedEmail: string | null;
  otpRequired: boolean;
  message: string;
}

export interface OtpVerifyResponse extends LoginResponse {
  otpRequired?: boolean;
  maskedEmail?: string | null;
  message?: string;
}

export const otpApi = {
  /** Demande un code OTP de login pour un compte existant. */
  requestLoginOtp: (email: string) =>
    apiRequest<OtpRequestResponse>("/api/auth/otp/request", {
      method: "POST",
      body: { email },
      noAuth: true,
    }),

  /** Vérifie le code et obtient les tokens (connexion 2FA). */
  verifyLoginOtp: (email: string, code: string) =>
    apiRequest<OtpVerifyResponse>("/api/auth/otp/verify", {
      method: "POST",
      body: { email, code },
      noAuth: true,
    }),

  /** Étape 1 — inscription : crée le compte et envoie le code d'activation. */
  registerWithOtp: (data: { name: string; email: string; password: string }) =>
    apiRequest<OtpRequestResponse>("/api/auth/otp/register", {
      method: "POST",
      body: data,
      noAuth: true,
    }),

  /** Étape 2 — activation du compte avec le code reçu par email. */
  verifyRegistration: (email: string, code: string) =>
    apiRequest<{ message: string; email: string }>("/api/auth/otp/register/verify", {
      method: "POST",
      body: { email, code },
      noAuth: true,
    }),

  /** Renvoie un code d'activation pour un compte non activé. */
  resendRegistrationOtp: (email: string) =>
    apiRequest<OtpRequestResponse>("/api/auth/otp/register/resend", {
      method: "POST",
      body: { email },
      noAuth: true,
    }),
};
