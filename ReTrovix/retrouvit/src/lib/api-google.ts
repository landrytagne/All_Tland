// ─── Google OAuth2 (CDC §5.1/§6.1) ──────────────────────────────────
import { apiRequest } from "./api-core";
import type { LoginResponse } from "./api-admin";

export const googleAuthApi = {
  /** Connexion via id_token Google Identity Services. */
  loginWithIdToken: (idToken: string) =>
    apiRequest<LoginResponse>("/api/auth/google", {
      method: "POST",
      body: { idToken },
      noAuth: true,
    }),

  /** Connexion via Authorization Code (flux serveur, CDC §6.1). */
  loginWithAuthorizationCode: (code: string, redirectUri: string) =>
    apiRequest<LoginResponse>("/api/auth/google/code", {
      method: "POST",
      body: { code, redirectUri },
      noAuth: true,
    }),

  /** URL de consentement Google à ouvrir. */
  getAuthorizationUrl: (redirectUri: string) =>
    apiRequest<{ url: string }>(
      `/api/auth/google/url?redirectUri=${encodeURIComponent(redirectUri)}`,
      { method: "GET", noAuth: true }
    ),
};
