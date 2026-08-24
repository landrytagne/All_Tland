// ─── Token management ───────────────────────────────────────────────

// Use empty string so all API calls go through Next.js rewrites (same-origin, no CORS)
const API_BASE_URL = "";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("retrouvit_token");
}

export function setAuthToken(token: string): void {
  localStorage.setItem("retrouvit_token", token);
}

export function removeAuthToken(): void {
  localStorage.removeItem("retrouvit_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("retrouvit_refresh_token");
}

export function setRefreshToken(token: string): void {
  localStorage.setItem("retrouvit_refresh_token", token);
}

export function removeRefreshToken(): void {
  localStorage.removeItem("retrouvit_refresh_token");
}

export function getTokenExpiry(): number | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem("retrouvit_token_expiry");
  return val ? parseInt(val, 10) : null;
}

export function setTokenExpiry(expiresIn: number): void {
  const expiry = Date.now() + expiresIn * 1000;
  localStorage.setItem("retrouvit_token_expiry", String(expiry));
}

export function getTokenPayload(): { email: string; role: string } | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { email: payload.sub, role: payload.role || "USER" };
  } catch {
    return null;
  }
}

// ─── Token refresh logic ────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) throw new Error("Refresh failed");
      const data = await response.json();
      setAuthToken(data.token);
      setRefreshToken(data.refreshToken);
      if (data.expiresIn) setTokenExpiry(data.expiresIn);
      return data.token;
    } catch (err) {
      removeAuthToken();
      removeRefreshToken();
      localStorage.removeItem("retrouvit_token_expiry");
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (!path.startsWith("/auth/")) window.location.href = "/auth/login";
      }
      throw err;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function isTokenNearExpiry(): boolean {
  const expiry = getTokenExpiry();
  if (!expiry) return false;
  return Date.now() > expiry - 5 * 60 * 1000;
}

// ─── API Error ──────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ─── Generic fetch wrapper ──────────────────────────────────────────

export interface RequestOptions extends Omit<RequestInit, "method" | "body"> {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  noAuth?: boolean;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, noAuth = false, headers: customHeaders, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = isFormData
    ? { ...((customHeaders as Record<string, string>) || {}) }
    : { "Content-Type": "application/json", ...((customHeaders as Record<string, string>) || {}) };

  if (!noAuth) {
    if (isTokenNearExpiry() && getRefreshToken()) {
      try { await refreshAccessToken(); } catch {}
    }
    const token = getAuthToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  // FormData (file uploads) must go directly to backend — Next.js rewrites can't proxy multipart
  const baseUrl = isFormData ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080") : API_BASE_URL;
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method, headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && !noAuth && getRefreshToken()) {
      try {
        const newToken = await refreshAccessToken();
        const retryHeaders: Record<string, string> = isFormData
          ? { ...((customHeaders as Record<string, string>) || {}) }
          : { "Content-Type": "application/json", ...((customHeaders as Record<string, string>) || {}) };
        retryHeaders["Authorization"] = `Bearer ${newToken}`;
        const retryResponse = await fetch(`${baseUrl}${endpoint}`, {
          method, headers: retryHeaders,
          body: isFormData ? body : body ? JSON.stringify(body) : undefined,
          ...rest,
        });
        if (retryResponse.status === 204) return undefined as T;
        const retryData = await retryResponse.json().catch(() => null);
        if (!retryResponse.ok) throw new ApiError(retryResponse.status, retryData?.message || retryData?.error || `Erreur ${retryResponse.status}`, retryData);
        return retryData as T;
      } catch (refreshErr) {
        if (refreshErr instanceof ApiError) throw refreshErr;
        removeAuthToken(); removeRefreshToken();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/")) window.location.href = "/auth/login";
      }
    }
    if (response.status === 401 && !noAuth) {
      removeAuthToken(); removeRefreshToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/")) window.location.href = "/auth/login";
    }
    throw new ApiError(response.status, data?.message || data?.error || `Erreur ${response.status}`, data);
  }
  return data as T;
}

// ─── Pagination ─────────────────────────────────────────────────────

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ─── Shared Types ───────────────────────────────────────────────────

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  location?: string;
  avatar?: string;
  trustScore?: number;
  objectsFound?: number;
  objectsLost?: number;
  matches?: number;
  verified?: boolean;
  walletBalance?: number;
  banned?: boolean;
  banReason?: string;
  bannedAt?: string;
  createdAt: string;
}

// ─── Certification Types & API ─────────────────────────────────────

export interface CertificationRequest {
  documentType: string;
  documentUrl: string;
  selfieUrl?: string;
}

export interface CertificationResponse {
  id: number;
  userId: number;
  userName: string;
  documentType: string;
  documentUrl: string;
  selfieUrl?: string;
  status: string; // PENDING, APPROVED, REJECTED, CANCELLED
  activeStatus: boolean;
  returnCountAtSubmission: number;
  trustScoreAtSubmission: number;
  rejectionReason?: string;
  adminNotes?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  createdAt: string;
}

export interface CertificationEligibility {
  eligible: boolean;
  active: boolean;
  notVerified: boolean;
  completedReturns: number;
  minReturns: number;
  trustScore: number;
  minTrustScore: number;
  hasPending: boolean;
}

export const certificationApi = {
  submitRequest: (data: CertificationRequest) =>
    apiRequest<CertificationResponse>("/api/certification/request", { method: "POST", body: data }),

  getMyRequests: () =>
    apiRequest<CertificationResponse[]>("/api/certification/my-requests"),

  getMyLatest: () =>
    apiRequest<CertificationResponse>("/api/certification/my-latest"),

  cancelRequest: (id: number) =>
    apiRequest<CertificationResponse>(`/api/certification/cancel/${id}`, { method: "POST" }),

  checkEligibility: () =>
    apiRequest<CertificationEligibility>("/api/certification/eligibility"),

  // Admin
  getAllPending: () =>
    apiRequest<CertificationResponse[]>("/api/certification/admin/pending"),

  getAllRequests: () =>
    apiRequest<CertificationResponse[]>("/api/certification/admin/all"),

  getByStatus: (status: string) =>
    apiRequest<CertificationResponse[]>(`/api/certification/admin/status/${status}`),

  approveRequest: (id: number, notes?: string) =>
    apiRequest<CertificationResponse>(`/api/certification/admin/${id}/approve`, {
      method: "POST",
      body: notes ? { notes } : {},
    }),

  rejectRequest: (id: number, reason: string, notes?: string) =>
    apiRequest<CertificationResponse>(`/api/certification/admin/${id}/reject`, {
      method: "POST",
      body: { reason, notes },
    }),

  getStats: () =>
    apiRequest<Record<string, unknown>>("/api/certification/admin/stats"),
};
