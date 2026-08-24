// ─── Barrel re-export for backward compatibility ────────────────────
// All actual code lives in focused modules for Turbopack performance.
// Import from specific sub-modules in new code:
//   import { lostObjectsApi } from "@/lib/api-objects"
//   import { conversationsApi } from "@/lib/api-chat"
//   import { authApi, adminApi } from "@/lib/api-admin"

// Core
export {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
  getTokenExpiry,
  setTokenExpiry,
  getTokenPayload,
  ApiError,
  apiRequest,
} from "./api-core";

export type { RequestOptions, PageResponse, UserResponse } from "./api-core";

// Objects (lost, found, matches, interactions, saved)
export {
  lostObjectsApi,
  foundObjectsApi,
  matchesApi,
  interactionsApi,
  savedApi,
} from "./api-objects";

export type {
  LostObjectRequest,
  LostObjectResponse,
  FoundObjectRequest,
  FoundObjectResponse,
  MatchResponse,
  InteractionResponse,
  CommentResponse,
  CommentRequest,
} from "./api-objects";

// Chat (conversations, notifications)
export {
  conversationsApi,
  notificationsApi,
} from "./api-chat";

export type {
  MessageResponse,
  ConversationResponse,
  NotificationResponse,
} from "./api-chat";

// Admin (auth, users, admin, wallet, escrow, reports, alerts, payments, thresholds)
export {
  authApi,
  usersApi,
  adminApi,
  walletApi,
  escrowApi,
  reportsApi,
  adminAlertsApi,
  paymentsApi,
  adminPaymentsApi,
  adminThresholdsApi,
} from "./api-admin";

export type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateUserRequest,
  AdminUser,
  TransactionResponse,
  EscrowResponse,
  ReportRequest,
  ReportResponse,
  AdminAlertResponse,
  PaymentRequest,
  PaymentResponse,
  PaymentStats,
  AdminPaymentStats,
  AlertThresholdResponse,
  AlertThresholdRequest,
} from "./api-admin";

// Returns (from separate file)
export {
  returnsApi,
  adminDisputesApi,
} from "./api-returns";

export type {
  ReturnRequestResponse,
  RatingResponse,
  DisputeStats,
} from "./api-returns";
