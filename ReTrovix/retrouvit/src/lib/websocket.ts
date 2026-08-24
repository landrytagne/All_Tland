import { Client, Message as StompMessage, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export type WsMessageType = 'CHAT' | 'IMAGE' | 'AUDIO' | 'DELETE' | 'EDIT' | 'TYPING' | 'READ' | 'ONLINE' | 'OFFLINE';

export interface WsMessage {
  type: WsMessageType;
  conversationId?: number;
  senderId?: number;
  senderName?: string;
  senderAvatar?: string;
  content?: string;
  imageUrl?: string;
  audioUrl?: string;
  messageId?: number;
  timestamp?: string;
  isRead?: boolean;
  createdAt?: string;
  replyToId?: number;
  replyToContent?: string;
  replyToSenderName?: string;
  deleted?: boolean;
  attachments?: Array<{
    id?: string;
    contentType?: string;
    contentUrl?: string;
    thumbnailUrl?: string;
    description?: string;
    fileSizeBytes?: number;
  }>;
}

type WsMessageHandler = (message: WsMessage) => void;

class WebSocketClient {
  private client: Client | null = null;
  private subscriptions: Map<number, any> = new Map();
  private statusSubscription: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private messageHandlers: WsMessageHandler[] = [];

  /**
   * Connect to WebSocket server.
   * @param token - JWT token for authentication
   * @param onConnect - callback when connected
   */
  connect(token: string, onConnect?: () => void): void {
    if (this.client?.connected) {
      onConnect?.();
      return;
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS(`/ws?token=${token}`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 2000,
      maxReconnectDelay: 30000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;
        onConnect?.();
      },
      onDisconnect: () => {
        console.log('[WS] Disconnected');
      },
      onStompError: (frame) => {
        console.error('[WS] STOMP error:', frame.headers['message'], frame.headers['body']);
        if (frame.headers['message'] === 'Missing authentication token') {
          console.error('[WS] Token is missing or invalid – check JWT');
        }
      },
      onWebSocketClose: (event) => {
        console.log('[WS] WebSocket closed', event?.code, event?.reason);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('[WS] Max reconnect attempts reached – giving up');
        } else {
          const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000);
          console.log(`[WS] Will retry in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        }
      },
    });

    this.client.activate();
  }

  /**
   * Disconnect from WebSocket.
   */
  disconnect(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
      this.statusSubscription = null;
    }
    this.client?.deactivate();
    this.client = null;
  }

  /**
   * Subscribe to a conversation for real-time messages.
   * @param conversationId - conversation ID
   * @param handler - callback for incoming messages
   */
  subscribeToConversation(conversationId: number, handler: WsMessageHandler): void {
    if (!this.client?.connected) {
      console.warn('[WS] Not connected, cannot subscribe');
      return;
    }

    // Unsubscribe from previous subscription for this conversation
    this.subscriptions.get(conversationId)?.unsubscribe();

    const sub = this.client.subscribe(
      `/topic/conversation/${conversationId}`,
      (message: IMessage) => {
        try {
          const wsMessage: WsMessage = JSON.parse(message.body);
          handler(wsMessage);
        } catch (e) {
          console.error('[WS] Failed to parse message:', e);
        }
      }
    );

    this.subscriptions.set(conversationId, sub);
    console.log(`[WS] Subscribed to conversation ${conversationId}`);
  }

  /**
   * Unsubscribe from a conversation.
   */
  unsubscribeFromConversation(conversationId: number): void {
    this.subscriptions.get(conversationId)?.unsubscribe();
    this.subscriptions.delete(conversationId);
  }

  /**
   * Send a chat message (text or image).
   */
  sendMessage(conversationId: number, content: string, imageUrl?: string): void {
    if (!this.client?.connected) {
      console.warn('[WS] Not connected, cannot send');
      return;
    }

    this.client.publish({
      destination: `/app/chat/${conversationId}`,
      body: JSON.stringify({ content, imageUrl }),
    });
  }

  /**
   * Send typing indicator.
   */
  sendTyping(conversationId: number): void {
    if (!this.client?.connected) return;

    this.client.publish({
      destination: `/app/chat/${conversationId}/typing`,
      body: JSON.stringify({}),
    });
  }

  /**
   * Send read receipt.
   */
  sendReadReceipt(conversationId: number): void {
    if (!this.client?.connected) return;

    this.client.publish({
      destination: `/app/chat/${conversationId}/read`,
      body: JSON.stringify({}),
    });
  }

  /**
   * Check if connected.
   */
  get isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

// Singleton
export const wsClient = new WebSocketClient();
