import { apiRequest } from "./api-core";
import type { UserResponse } from "./api-core";

// ─── Return Requests API ──────────────────────────────────

export interface ReturnRequestResponse {
  id: number;
  reference: string;
  lostObjectId?: number;
  lostObjectTitle?: string;
  foundObjectId?: number;
  foundObjectTitle?: string;
  loser: UserResponse;
  finder: UserResponse;
  proposedAmount?: number;
  acceptedAmount?: number;
  platformFeePct: number;
  status: string;
  loserValidated: boolean;
  finderValidated: boolean;
  loserReturnConfirmed: boolean;
  finderReturnConfirmed: boolean;
  meetingDate?: string;
  meetingLocation?: string;
  meetingLat?: number;
  meetingLng?: number;
  disputeReason?: string;
  disputeResolved?: boolean;
  disputeResolution?: string;
  disputedBy?: number;
  paymentAmount?: number;
  platformFee?: number;
  completedAt?: string;
  createdAt: string;
  hasRating?: boolean;
  isFullyValidated?: boolean;
  isFullyReturned?: boolean;
}

export interface RatingResponse {
  id: number;
  returnRequestId: number;
  rater: UserResponse;
  rated: UserResponse;
  stars: number;
  comment?: string;
  createdAt: string;
  averageRating?: number;
  ratingCount?: number;
}

export const returnsApi = {
  initiate: (data: { loserId: number; finderId?: number; lostObjectId?: number; foundObjectId?: number }) =>
    apiRequest<ReturnRequestResponse>("/api/returns", {
      method: "POST",
      body: data,
    }),

  getMy: () =>
    apiRequest<ReturnRequestResponse[]>("/api/returns"),

  getById: (id: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}`),

  proposeReward: (id: number, amount: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/propose-reward`, {
      method: "POST",
      body: { amount },
    }),

  acceptReward: (id: number, amount: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/accept-reward`, {
      method: "POST",
      body: { amount },
    }),

  validate: (id: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/validate`, {
      method: "POST",
    }),

  setAppointment: (id: number, data: {
    meetingDate: string;
    meetingLocation: string;
    meetingLat?: number;
    meetingLng?: number;
  }) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/set-appointment`, {
      method: "POST",
      body: data,
    }),

  startReturn: (id: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/start-return`, {
      method: "POST",
    }),

  confirmReturn: (id: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/confirm-return`, {
      method: "POST",
    }),

  dispute: (id: number, reason: string) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/dispute`, {
      method: "POST",
      body: { reason },
    }),

  resolveDispute: (id: number, resolution: string) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/resolve-dispute`, {
      method: "POST",
      body: { resolution },
    }),

  rate: (id: number, stars: number, comment?: string) =>
    apiRequest<RatingResponse>(`/api/returns/${id}/rate`, {
      method: "POST",
      body: { stars, comment },
    }),

  getRatings: (userId: number) =>
    apiRequest<RatingResponse[]>(`/api/returns/${userId}/ratings`),
};

// ─── Admin Disputes API ────────────────────────────────────

export interface DisputeStats {
  totalDisputes: number;
  resolvedDisputes: number;
  disputeRate: number;
  totalReturns: number;
  completedReturns: number;
  totalVolume: number;
  totalPlatformFees: number;
}

export const adminDisputesApi = {
  getAll: () =>
    apiRequest<ReturnRequestResponse[]>("/api/admin/disputes"),

  getStats: () =>
    apiRequest<DisputeStats>("/api/admin/disputes/stats"),

  resolve: (id: number, resolution: string) =>
    apiRequest<ReturnRequestResponse>(`/api/admin/disputes/${id}/resolve`, {
      method: "POST",
      body: { resolution },
    }),
};
