import { apiRequest } from "./api-core";
import type { PageResponse, UserResponse } from "./api-core";
import type { LostObjectResponse, FoundObjectResponse } from "./api-objects";

// ─── Auth API ───────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  id?: number;
  name?: string;
  token: string;
  refreshToken: string;
  expiresIn: number;
  email: string;
  role: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiRequest<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: data,
      noAuth: true,
    }),

  register: (data: RegisterRequest) =>
    apiRequest<UserResponse>("/api/users", {
      method: "POST",
      body: { ...data, role: data.role || "USER" },
      noAuth: true,
    }),

  refresh: (refreshToken: string) =>
    apiRequest<LoginResponse>("/api/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      noAuth: true,
    }),

  logout: (refreshToken: string | null) =>
    apiRequest<{ message: string }>("/api/auth/logout", {
      method: "POST",
      body: { refreshToken },
      noAuth: true,
    }),

  logoutAll: () =>
    apiRequest<{ message: string }>("/api/auth/logout-all", {
      method: "POST",
    }),

  forgotPassword: (email: string) =>
    apiRequest<{ message: string; token?: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: { email },
      noAuth: true,
    }),

  resetPassword: (token: string, newPassword: string) =>
    apiRequest<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: { token, newPassword },
      noAuth: true,
    }),
};

// ─── Users API ──────────────────────────────────────────────────────

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  location?: string;
  avatar?: string;
}

export const usersApi = {
  getMe: (id: number) =>
    apiRequest<UserResponse>(`/api/users/${id}`),

  getMeFromToken: () =>
    apiRequest<UserResponse>("/api/auth/me"),

  update: (id: number, data: UpdateUserRequest) =>
    apiRequest<UserResponse>(`/api/users/${id}`, {
      method: "PUT",
      body: data,
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/users/${id}`, {
      method: "DELETE",
    }),

  getAll: () =>
    apiRequest<UserResponse[]>("/api/users"),
};

// ─── Admin API ──────────────────────────────────────────────────────

export interface AdminUser extends UserResponse {}

export const adminApi = {
  getUsers: () =>
    apiRequest<AdminUser[]>("/api/admin/users"),

  getUser: (id: number) =>
    apiRequest<AdminUser>(`/api/admin/users/${id}`),

  banUser: (id: number, reason?: string) =>
    apiRequest<AdminUser>(`/api/admin/users/${id}/ban`, {
      method: "PUT",
      body: { reason },
    }),

  unbanUser: (id: number) =>
    apiRequest<AdminUser>(`/api/admin/users/${id}/unban`, {
      method: "PUT",
    }),

  verifyUser: (id: number) =>
    apiRequest<AdminUser>(`/api/admin/users/${id}/verify`, {
      method: "PUT",
    }),

  unverifyUser: (id: number) =>
    apiRequest<AdminUser>(`/api/admin/users/${id}/unverify`, {
      method: "PUT",
    }),

  changeRole: (id: number, role: string) =>
    apiRequest<AdminUser>(`/api/admin/users/${id}/role`, {
      method: "PUT",
      body: { role },
    }),

  deleteUser: (id: number) =>
    apiRequest<void>(`/api/admin/users/${id}`, {
      method: "DELETE",
    }),

  getBannedUsers: () =>
    apiRequest<AdminUser[]>("/api/admin/users/banned"),

  getVerifiedUsers: () =>
    apiRequest<AdminUser[]>("/api/admin/users/verified"),
};

// ─── Wallet API ─────────────────────────────────────────────────────

export interface TransactionResponse {
  id: number;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

export const walletApi = {
  getBalance: () =>
    apiRequest<{ balance: number }>("/api/wallet/balance"),

  getTransactions: () =>
    apiRequest<TransactionResponse[]>("/api/wallet/transactions"),

  deposit: (amount: number) =>
    apiRequest<{ message: string }>("/api/wallet/deposit", {
      method: "POST",
      body: { amount },
    }),
};

// ─── Escrow API ─────────────────────────────────────────────────────

export interface EscrowResponse {
  id: number;
  reference: string;
  lostObject?: LostObjectResponse;
  foundObject?: FoundObjectResponse;
  buyer: UserResponse;
  seller: UserResponse;
  amount: number;
  status: string;
  deadline: string;
  daysLeft: number;
  progress: number;
  location?: string;
  completedAt?: string;
  createdAt: string;
}

export const escrowApi = {
  getAll: () =>
    apiRequest<EscrowResponse[]>("/api/escrows"),

  create: (data: { sellerId: number; amount: number; location?: string }) =>
    apiRequest<EscrowResponse>("/api/escrows", {
      method: "POST",
      body: data,
    }),

  confirmReturn: (id: number) =>
    apiRequest<EscrowResponse>(`/api/escrows/${id}/confirm-return`, {
      method: "PUT",
    }),

  complete: (id: number) =>
    apiRequest<EscrowResponse>(`/api/escrows/${id}/complete`, {
      method: "PUT",
    }),

  refund: (id: number) =>
    apiRequest<EscrowResponse>(`/api/escrows/${id}/refund`, {
      method: "PUT",
    }),
};

// ─── Reports API ────────────────────────────────────────────────────

export interface ReportRequest {
  type: string;
  subject: string;
  description: string;
  reportedUserId?: number;
  lostObjectId?: number;
  foundObjectId?: number;
  relatedTransaction?: number;
  amount?: number;
}

export interface ReportResponse {
  id: number;
  type: string;
  status: string;
  subject: string;
  description: string;
  reporter: UserResponse;
  reported?: UserResponse;
  lostObjectId?: number;
  lostObjectTitle?: string;
  foundObjectId?: number;
  foundObjectTitle?: string;
  relatedTransaction?: number;
  amount?: number;
  priority: string;
  resolution?: string;
  resolvedBy?: number;
  createdAt: string;
  updatedAt: string;
}

export const reportsApi = {
  create: (data: ReportRequest) =>
    apiRequest<ReportResponse>("/api/reports", {
      method: "POST",
      body: data,
    }),

  getMy: () =>
    apiRequest<ReportResponse[]>("/api/reports/my"),

  getAll: () =>
    apiRequest<ReportResponse[]>("/api/reports"),

  getById: (id: number) =>
    apiRequest<ReportResponse>(`/api/reports/${id}`),

  getByStatus: (status: string) =>
    apiRequest<ReportResponse[]>(`/api/reports/status/${status}`),

  getByType: (type: string) =>
    apiRequest<ReportResponse[]>(`/api/reports/type/${type}`),

  getByUser: (userId: number) =>
    apiRequest<ReportResponse[]>(`/api/reports/user/${userId}`),

  updateStatus: (id: number, status: string) =>
    apiRequest<ReportResponse>(`/api/reports/${id}/status`, {
      method: "PUT",
      body: { status },
    }),

  resolve: (id: number, resolution: string) =>
    apiRequest<ReportResponse>(`/api/reports/${id}/resolve`, {
      method: "PUT",
      body: { resolution },
    }),

  escalate: (id: number) =>
    apiRequest<ReportResponse>(`/api/reports/${id}/escalate`, {
      method: "PUT",
    }),

  dismiss: (id: number, reason: string) =>
    apiRequest<ReportResponse>(`/api/reports/${id}/dismiss`, {
      method: "PUT",
      body: { reason },
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/reports/${id}`, {
      method: "DELETE",
    }),

  getStats: () =>
    apiRequest<Record<string, number>>("/api/reports/stats"),
};

// ─── Admin Alerts API ────────────────────────────────────────────

export interface AdminAlertResponse {
  id: number;
  level: "INFO" | "WARNING" | "CRITICAL";
  category: string;
  title: string;
  message: string;
  currentValue: number;
  thresholdValue: number;
  acknowledged: boolean;
  acknowledgedAt?: string;
  createdAt: string;
}

export const adminAlertsApi = {
  getActive: () =>
    apiRequest<AdminAlertResponse[]>("/api/admin/alerts"),

  getAll: () =>
    apiRequest<AdminAlertResponse[]>("/api/admin/alerts/all"),

  getStats: () =>
    apiRequest<Record<string, number>>("/api/admin/alerts/stats"),

  acknowledge: (id: number) =>
    apiRequest<AdminAlertResponse>(`/api/admin/alerts/${id}/acknowledge`, {
      method: "PUT",
    }),
};

// ─── Payments API ──────────────────────────────────────────────

export interface PaymentRequest {
  provider: string;
  method: string;
  amount: number;
  phoneNumber?: string;
}

export interface PaymentResponse {
  id: number;
  reference: string;
  provider: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  phoneNumber?: string;
  externalReference?: string;
  failureReason?: string;
  completedAt?: string;
  createdAt: string;
}

export interface PaymentStats {
  totalPayments: number;
  totalDeposited: number;
}

export const paymentsApi = {
  initiate: (data: PaymentRequest) =>
    apiRequest<PaymentResponse>("/api/payments", {
      method: "POST",
      body: data,
    }),

  getStatus: (reference: string) =>
    apiRequest<PaymentResponse>(`/api/payments/${reference}`),

  getHistory: () =>
    apiRequest<PaymentResponse[]>("/api/payments"),

  getStats: () =>
    apiRequest<PaymentStats>("/api/payments/stats"),
};

// ─── Admin Payments API ──────────────────────────────────────

export interface AdminPaymentStats {
  totalPayments: number;
  totalDeposited: number;
  pendingCount: number;
  pendingAmount: number;
  byProvider: Record<string, number>;
  byStatus: Record<string, number>;
}

export const adminPaymentsApi = {
  getAll: () =>
    apiRequest<PaymentResponse[]>("/api/admin/payments"),

  getStats: () =>
    apiRequest<AdminPaymentStats>("/api/admin/payments/stats"),

  search: (query: string) =>
    apiRequest<PaymentResponse[]>(`/api/admin/payments/search?q=${encodeURIComponent(query)}`),
};

// ─── Admin Thresholds API ────────────────────────────────────────

export interface AlertThresholdResponse {
  id: number;
  category: string;
  level: "INFO" | "WARNING" | "CRITICAL";
  value: number;
  enabled: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertThresholdRequest {
  value?: number;
  enabled?: boolean;
  description?: string;
}

export const adminThresholdsApi = {
  getAll: () =>
    apiRequest<AlertThresholdResponse[]>("/api/admin/thresholds"),

  getByCategory: (category: string) =>
    apiRequest<AlertThresholdResponse[]>(`/api/admin/thresholds/${category}`),

  update: (id: number, data: AlertThresholdRequest) =>
    apiRequest<AlertThresholdResponse>(`/api/admin/thresholds/${id}`, {
      method: "PUT",
      body: data,
    }),

  resetDefaults: () =>
    apiRequest<{ message: string; count: number }>("/api/admin/thresholds/reset", {
      method: "POST",
    }),
};

// ─── Categories API ────────────────────────────────────────────

export interface CategoryResponse {
  id: number;
  name: string;
  icon: string;
  sortOrder: number;
  enabled: boolean;
  objectCount: number;
  createdAt: string;
}

export const categoriesApi = {
  getAll: () =>
    apiRequest<CategoryResponse[]>("/api/categories"),

  getEnabled: () =>
    apiRequest<CategoryResponse[]>("/api/categories/enabled"),

  getById: (id: number) =>
    apiRequest<CategoryResponse>(`/api/categories/${id}`),

  create: (data: { name: string; icon?: string }) =>
    apiRequest<CategoryResponse>("/api/categories", {
      method: "POST",
      body: data,
    }),

  update: (id: number, data: { name?: string; icon?: string; enabled?: boolean }) =>
    apiRequest<CategoryResponse>(`/api/categories/${id}`, {
      method: "PUT",
      body: data,
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/categories/${id}`, {
      method: "DELETE",
    }),
};

// ─── Cities API ────────────────────────────────────────────────

export interface CityResponse {
  id: number;
  name: string;
  region: string;
  enabled: boolean;
  objectCount: number;
  createdAt: string;
}

export const citiesApi = {
  getAll: () =>
    apiRequest<CityResponse[]>("/api/cities"),

  getEnabled: () =>
    apiRequest<CityResponse[]>("/api/cities/enabled"),

  getById: (id: number) =>
    apiRequest<CityResponse>(`/api/cities/${id}`),

  create: (data: { name: string; region?: string }) =>
    apiRequest<CityResponse>("/api/cities", {
      method: "POST",
      body: data,
    }),

  update: (id: number, data: { name?: string; region?: string; enabled?: boolean }) =>
    apiRequest<CityResponse>(`/api/cities/${id}`, {
      method: "PUT",
      body: data,
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/cities/${id}`, {
      method: "DELETE",
    }),
};

// ─── Platform Settings API ────────────────────────────────────

export interface PlatformSettingsResponse {
  id: number;
  settingKey: string;
  settingValue: string;
  settingType: string;
  description: string;
  updatedAt: string;
}

export const platformSettingsApi = {
  getAll: () =>
    apiRequest<PlatformSettingsResponse[]>("/api/settings"),

  getByKey: (key: string) =>
    apiRequest<PlatformSettingsResponse>(`/api/settings/${key}`),

  update: (key: string, value: string) =>
    apiRequest<PlatformSettingsResponse>(`/api/settings/${key}`, {
      method: "PUT",
      body: { value },
    }),

  updateMultiple: (settings: Record<string, string>) =>
    apiRequest<PlatformSettingsResponse[]>("/api/settings", {
      method: "PUT",
      body: settings,
    }),

  initializeDefaults: () =>
    apiRequest<{ message: string }>("/api/settings/initialize", {
      method: "POST",
    }),
};

// ─── Admin Analytics API ───────────────────────────────────────

export const adminAnalyticsApi = {
  getStats: () =>
    apiRequest<Record<string, unknown>>("/api/admin/analytics"),

  getOverview: () =>
    apiRequest<Record<string, unknown>>("/api/admin/analytics/overview"),
};

// ─── Admin Conversations API ───────────────────────────────────

export interface AdminConversationResponse {
  id: number;
  participants: { id: number; name: string; avatar?: string }[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: string;
}

export const adminConversationsApi = {
  getAll: () =>
    apiRequest<AdminConversationResponse[]>("/api/admin/conversations"),

  getStats: () =>
    apiRequest<Record<string, number>>("/api/admin/conversations/stats"),
};
