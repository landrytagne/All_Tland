import { apiRequest } from "./api-core";
import type { UserResponse } from "./api-core";

// ─── Conversations / Messages API ───────────────────────────────────

export interface MessageResponse {
  id: number;
  senderId: number;
  senderName?: string;
  senderAvatar?: string;
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  replyToId?: number;
  replyToContent?: string;
  replyToSenderName?: string;
  read: boolean;
  deleted?: boolean;
  createdAt: string;
}

export interface ConversationResponse {
  id: number;
  participant: UserResponse;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  messages: MessageResponse[];
  status?: string;
  pendingForMe?: boolean;
  createdByUserId?: number;
}

export const conversationsApi = {
  getAll: () =>
    apiRequest<ConversationResponse[]>("/api/conversations"),

  getById: (id: number) =>
    apiRequest<ConversationResponse>(`/api/conversations/${id}`),

  getOrCreate: (otherUserId: number) =>
    apiRequest<ConversationResponse>(`/api/conversations/with/${otherUserId}`),

  getOrCreateWithMessage: (
    otherUserId: number,
    message: string,
    objectTitle?: string,
    objectType?: string,
    objectId?: string
  ) =>
    apiRequest<ConversationResponse>(`/api/conversations/with/${otherUserId}/message`, {
      method: "POST",
      body: { message, objectTitle, objectType, objectId },
    }),

  sendMessage: (conversationId: number, content?: string, imageUrl?: string, audioUrl?: string, replyToId?: number) =>
    apiRequest<MessageResponse>(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      body: { content: content || "", imageUrl: imageUrl || null, audioUrl: audioUrl || null, replyToId: replyToId || null },
    }),

  deleteMessage: (conversationId: number, messageId: number) =>
    apiRequest<void>(`/api/conversations/${conversationId}/messages/${messageId}`, {
      method: "DELETE",
    }),

  pollMessages: (conversationId: number, afterMessageId?: number) =>
    apiRequest<MessageResponse[]>(
      `/api/conversations/${conversationId}/messages/poll?afterMessageId=${afterMessageId || 0}`
    ),

  markAsRead: (conversationId: number) =>
    apiRequest<void>(`/api/conversations/${conversationId}/read`, {
      method: "PUT",
    }),

  getUnreadCount: () =>
    apiRequest<{ count: number }>("/api/conversations/unread/count"),

  accept: (conversationId: number) =>
    apiRequest<ConversationResponse>(`/api/conversations/${conversationId}/accept`, {
      method: "POST",
    }),

  reject: (conversationId: number) =>
    apiRequest<ConversationResponse>(`/api/conversations/${conversationId}/reject`, {
      method: "POST",
    }),
};

// ─── Notifications API ──────────────────────────────────────────────

export interface NotificationResponse {
  id: number;
  type: string;
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
  conversationId?: number;
  createdByUserId?: number;
}

export const notificationsApi = {
  getAll: () =>
    apiRequest<NotificationResponse[]>("/api/notifications"),

  getUnread: () =>
    apiRequest<NotificationResponse[]>("/api/notifications/unread"),

  getUnreadCount: () =>
    apiRequest<{ count: number }>("/api/notifications/unread/count"),

  getByType: (type: string) =>
    apiRequest<NotificationResponse[]>(`/api/notifications/type/${type}`),

  markAsRead: (id: number) =>
    apiRequest<void>(`/api/notifications/${id}/read`, {
      method: "PUT",
    }),

  markAllAsRead: () =>
    apiRequest<void>("/api/notifications/read-all", {
      method: "PUT",
    }),
};
