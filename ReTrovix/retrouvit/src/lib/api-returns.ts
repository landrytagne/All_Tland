import { apiRequest } from "./api-core";
import type { UserResponse } from "./api-core";

// ─── Flow de restitution officiel (machine d'états §25) ───
// MATCH_FOUND → VERIFICATION_PENDING → VERIFIED → CONNECTION_PENDING →
// CHAT_ACTIVE → PROPOSAL_PENDING → PAYMENT_PENDING → ESCROW_FUNDED →
// MISSION_READY → MISSION_STARTED → MEETING_IN_PROGRESS → HANDOVER_PENDING → COMPLETED

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
  verificationAttempts?: number;
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
}

export interface TimelineEvent {
  id: number;
  eventType: string;
  description?: string;
  actorName: string;
  createdAt: string;
}

// ─── §13 : Partage de position (mission uniquement) ───────

export interface LocationShareResponse {
  returnRequestId: number;
  user: UserResponse;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  updatedAt?: string;
  /** false = position masquée (avant mission / après restitution §20). */
  sharingActive: boolean;
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
  /** Créer la collaboration (MATCH_FOUND). */
  initiate: (data: { loserId: number; finderId?: number; lostObjectId?: number; foundObjectId?: number }) =>
    apiRequest<ReturnRequestResponse>("/api/returns", {
      method: "POST",
      body: data,
    }),

  getMy: () =>
    apiRequest<ReturnRequestResponse[]>("/api/returns"),

  getById: (id: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}`),

  // ─── §2 : Vérification de propriété ──────────────────────
  verifyOwnership: (id: number, answer: string) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/verify-ownership`, {
      method: "POST",
      body: { answer },
    }),

  // ─── §3-4 : Mise en relation ─────────────────────────────
  requestConnection: (id: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/request-connection`, {
      method: "POST",
    }),

  acceptConnection: (id: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/accept-connection`, {
      method: "POST",
    }),

  rejectConnection: (id: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/reject-connection`, {
      method: "POST",
    }),

  // ─── §6-8 : Proposition ──────────────────────────────────
  propose: (id: number, data: { amount: number; meetingDate: string; location: string; lat?: number; lng?: number }) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/propose`, {
      method: "POST",
      body: data,
    }),

  acceptProposal: (id: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/accept-proposal`, {
      method: "POST",
    }),

  counterProposal: (id: number, amount: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/counter-proposal`, {
      method: "POST",
      body: { amount },
    }),

  rejectProposal: (id: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/reject-proposal`, {
      method: "POST",
    }),

  // ─── §9-10 : Paiement en séquestre ───────────────────────
  pay: (id: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/pay`, {
      method: "POST",
    }),

  // ─── §11-14 : Mission ────────────────────────────────────
  startMission: (id: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/start-mission`, {
      method: "POST",
    }),

  markArrival: (id: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/arrived`, {
      method: "POST",
    }),

  // ─── §15-19 : Double confirmation + libération auto ──────
  confirmHandover: (id: number) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/confirm-handover`, {
      method: "POST",
    }),

  // ─── §22-23 : Litiges ────────────────────────────────────
  dispute: (id: number, reason: string) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/dispute`, {
      method: "POST",
      body: { reason },
    }),

  resolveDispute: (id: number, resolution: string, refundForLoser?: boolean) =>
    apiRequest<ReturnRequestResponse>(`/api/returns/${id}/resolve-dispute`, {
      method: "POST",
      body: { resolution, refundForLoser },
    }),

  // ─── §21 : Évaluation ────────────────────────────────────
  rate: (id: number, stars: number, comment?: string) =>
    apiRequest<RatingResponse>(`/api/returns/${id}/rate`, {
      method: "POST",
      body: { stars, comment },
    }),

  getRatings: (userId: number) =>
    apiRequest<RatingResponse[]>(`/api/returns/${userId}/ratings`),

  // ─── §24 : Timeline d'audit ──────────────────────────────
  getTimeline: (id: number) =>
    apiRequest<TimelineEvent[]>(`/api/returns/${id}/timeline`),

  // ─── §13/§20 : Partage de position ───────────────────────
  updateLocation: (
    id: number,
    data: { latitude: number; longitude: number; accuracyMeters?: number }
  ) =>
    apiRequest<LocationShareResponse>(`/api/returns/${id}/location`, {
      method: "POST",
      body: data,
    }),

  getPeerLocation: (id: number) =>
    apiRequest<LocationShareResponse>(`/api/returns/${id}/location/peer`),

  getMyLocation: (id: number) =>
    apiRequest<LocationShareResponse>(`/api/returns/${id}/location/me`),
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

  resolve: (id: number, resolution: string, refundForLoser?: boolean) =>
    apiRequest<ReturnRequestResponse>(`/api/admin/disputes/${id}/resolve`, {
      method: "POST",
      body: { resolution, refundForLoser },
    }),
};

// ─── §24 : Admin Collaborations API ────────────────────────

export interface EscrowInfo {
  id: number;
  reference: string;
  amount: number;
  status?: string;
  progress?: number;
  location?: string;
  deadline?: string;
  completedAt?: string;
  createdAt?: string;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  senderName: string;
  content?: string;
  imageUrl?: string;
  deleted: boolean;
  createdAt: string;
}

export interface ProofInfo {
  id: number;
  submittedByName: string;
  description?: string;
  characteristics?: string;
  condition?: string;
  discoveryLocation?: string;
  serialNumber?: string;
  status?: string;
  reviewNote?: string;
  photos?: string;
  createdAt: string;
}

export interface LiveLocation {
  userId: number;
  userName: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  updatedAt: string;
}

export interface CollaborationDetail {
  collaboration: ReturnRequestResponse;
  timeline: TimelineEvent[];
  escrow?: EscrowInfo | null;
  messages: ChatMessage[];
  proofs: ProofInfo[];
  locations: LiveLocation[];
}

export const adminCollaborationsApi = {
  getAll: (status?: string) =>
    apiRequest<ReturnRequestResponse[]>(
      `/api/admin/collaborations${status ? `?status=${status}` : ""}`
    ),

  getDetail: (id: number) =>
    apiRequest<CollaborationDetail>(`/api/admin/collaborations/${id}`),
};
