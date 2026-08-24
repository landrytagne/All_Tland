import { apiRequest } from "./api-core";
import type { PageResponse, UserResponse } from "./api-core";

export type { PageResponse } from "./api-core";

// ─── Lost Objects API ───────────────────────────────────────────────

export interface LostObjectRequest {
  title: string;
  description: string;
  category: string;
  location: string;
  city: string;
  dateLost?: string;
  image?: string;
  images?: string;
  reward?: number;
}

export interface LostObjectResponse {
  id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  city: string;
  dateLost: string;
  image?: string;
  images?: string;
  status: string;
  reward?: number;
  views: number;
  user: UserResponse;
  createdAt: string;
}

export const lostObjectsApi = {
  getAll: (page = 0, size = 12) =>
    apiRequest<PageResponse<LostObjectResponse>>(`/api/lost-objects?page=${page}&size=${size}`),

  getAllList: () =>
    apiRequest<LostObjectResponse[]>("/api/lost-objects/all"),

  getById: (id: number) =>
    apiRequest<LostObjectResponse>(`/api/lost-objects/${id}`),

  getByUserId: (userId: number, page = 0, size = 12) =>
    apiRequest<PageResponse<LostObjectResponse>>(`/api/lost-objects/user/${userId}?page=${page}&size=${size}`),

  getByCategory: (category: string, page = 0, size = 12) =>
    apiRequest<PageResponse<LostObjectResponse>>(`/api/lost-objects/category/${encodeURIComponent(category)}?page=${page}&size=${size}`),

  getByCity: (city: string, page = 0, size = 12) =>
    apiRequest<PageResponse<LostObjectResponse>>(`/api/lost-objects/city/${encodeURIComponent(city)}?page=${page}&size=${size}`),

  create: (data: LostObjectRequest) =>
    apiRequest<LostObjectResponse>("/api/lost-objects", {
      method: "POST",
      body: data,
    }),

  update: (id: number, data: LostObjectRequest) =>
    apiRequest<LostObjectResponse>(`/api/lost-objects/${id}`, {
      method: "PUT",
      body: data,
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/lost-objects/${id}`, {
      method: "DELETE",
    }),
};

// ─── Found Objects API ──────────────────────────────────────────────

export interface FoundObjectRequest {
  title: string;
  description: string;
  category: string;
  location: string;
  city: string;
  dateFound?: string;
  image?: string;
  images?: string;
}

export interface FoundObjectResponse {
  id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  city: string;
  dateFound: string;
  image?: string;
  images?: string;
  status: string;
  views: number;
  user: UserResponse;
  createdAt: string;
}

export const foundObjectsApi = {
  getAll: (page = 0, size = 12) =>
    apiRequest<PageResponse<FoundObjectResponse>>(`/api/found-objects?page=${page}&size=${size}`),

  getAllList: () =>
    apiRequest<FoundObjectResponse[]>("/api/found-objects/all"),

  getById: (id: number) =>
    apiRequest<FoundObjectResponse>(`/api/found-objects/${id}`),

  getByUserId: (userId: number, page = 0, size = 12) =>
    apiRequest<PageResponse<FoundObjectResponse>>(`/api/found-objects/user/${userId}?page=${page}&size=${size}`),

  getByCategory: (category: string, page = 0, size = 12) =>
    apiRequest<PageResponse<FoundObjectResponse>>(`/api/found-objects/category/${encodeURIComponent(category)}?page=${page}&size=${size}`),

  getByCity: (city: string, page = 0, size = 12) =>
    apiRequest<PageResponse<FoundObjectResponse>>(`/api/found-objects/city/${encodeURIComponent(city)}?page=${page}&size=${size}`),

  create: (data: FoundObjectRequest) =>
    apiRequest<FoundObjectResponse>("/api/found-objects", {
      method: "POST",
      body: data,
    }),

  update: (id: number, data: FoundObjectRequest) =>
    apiRequest<FoundObjectResponse>(`/api/found-objects/${id}`, {
      method: "PUT",
      body: data,
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/found-objects/${id}`, {
      method: "DELETE",
    }),
};

// ─── Matches API ────────────────────────────────────────────────────

export interface MatchResponse {
  id: number;
  lostObject: LostObjectResponse;
  foundObject: FoundObjectResponse;
  matchScore: number;
  status: string;
  user: UserResponse;
  createdAt: string;
}

export const matchesApi = {
  getAll: () =>
    apiRequest<MatchResponse[]>("/api/matches"),

  getByStatus: (status: string) =>
    apiRequest<MatchResponse[]>(`/api/matches/status/${status}`),

  confirm: (id: number) =>
    apiRequest<MatchResponse>(`/api/matches/${id}/confirm`, {
      method: "PUT",
    }),

  reject: (id: number) =>
    apiRequest<MatchResponse>(`/api/matches/${id}/reject`, {
      method: "PUT",
    }),
};

// ─── Interactions API (Likes & Comments) ───────────────────────

export interface InteractionResponse {
  likeCount: number;
  liked: boolean;
  commentCount: number;
}

export interface CommentResponse {
  id: number;
  content: string;
  user: UserResponse;
  lostObjectId?: number;
  foundObjectId?: number;
  parentId?: number;
  deleted: boolean;
  replies: CommentResponse[];
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommentRequest {
  content: string;
  lostObjectId?: number;
  foundObjectId?: number;
  parentId?: number;
}

// ─── Saved Objects API ────────────────────────────────────────

export const savedApi = {
  getStatus: (objectType: string, objectId: number) =>
    apiRequest<{ saved: boolean }>(`/api/saved/${objectType}/${objectId}`),

  toggle: (objectType: string, objectId: number) =>
    apiRequest<{ saved: boolean }>(`/api/saved/${objectType}/${objectId}/toggle`, {
      method: "POST",
    }),

  getCount: () =>
    apiRequest<{ count: number }>("/api/saved/count"),
};

export const interactionsApi = {
  get: (objectType: string, objectId: number) =>
    apiRequest<InteractionResponse>(`/api/interactions/${objectType}/${objectId}`),

  toggleLike: (objectType: string, objectId: number) =>
    apiRequest<InteractionResponse>(`/api/interactions/${objectType}/${objectId}/like`, {
      method: "POST",
    }),

  getComments: (objectType: string, objectId: number) =>
    apiRequest<CommentResponse[]>(`/api/interactions/${objectType}/${objectId}/comments`),

  addComment: (objectType: string, objectId: number, data: CommentRequest) =>
    apiRequest<CommentResponse>(`/api/interactions/${objectType}/${objectId}/comments`, {
      method: "POST",
      body: data,
    }),

  deleteComment: (commentId: number) =>
    apiRequest<void>(`/api/interactions/comments/${commentId}`, {
      method: "DELETE",
    }),
};
