import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface NotificationWsMessage {
  type: string;          // "MATCH", "NOTIFICATION", "READ_ALL", "CONVERSATION_REQUEST"
  id?: number;
  title?: string;
  description?: string;
  matchId?: number;
  matchScore?: number;
  objectTitle?: string;
  conversationId?: number;
  timestamp?: number;
}

type NotificationHandler = (message: NotificationWsMessage) => void;

class NotificationWsClient {
  private client: Client | null = null;
  private notificationSub: any = null;
  private matchSub: any = null;
  private adminSub: any = null;
  private handlers: NotificationHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;

  /**
   * Connect to WebSocket and subscribe to user-specific notification channels.
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
        console.log('[NotifWS] Connected');
        this.reconnectAttempts = 0;
        this.subscribeToNotifications();
        onConnect?.();
      },
      onDisconnect: () => {
        console.log('[NotifWS] Disconnected');
      },
      onStompError: (frame) => {
        console.error('[NotifWS] STOMP error:', frame.headers['message']);
      },
      onWebSocketClose: (event) => {
        console.log('[NotifWS] WebSocket closed', event?.code, event?.reason);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.warn('[NotifWS] Max reconnect attempts reached – disabling reconnection');
          this.client?.deactivate();
        } else {
          const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000);
          console.log(`[NotifWS] Will retry in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        }
      },
    });

    this.client.activate();
  }

  /**
   * Subscribe to notification and match channels.
   * STOMP user destination automatically prefixes with /user/{userId}
   */
  private subscribeToNotifications(): void {
    if (!this.client?.connected) return;

    // Subscribe to notifications queue
    this.notificationSub = this.client.subscribe(
      '/user/queue/notifications',
      (message: IMessage) => {
        try {
          const notif: NotificationWsMessage = JSON.parse(message.body);
          console.log('[NotifWS] Notification received:', notif.type);
          this.handlers.forEach((h) => h(notif));
        } catch (e) {
          console.error('[NotifWS] Failed to parse notification:', e);
        }
      }
    );

    // Subscribe to match alerts queue
    this.matchSub = this.client.subscribe(
      '/user/queue/matches',
      (message: IMessage) => {
        try {
          const match: NotificationWsMessage = JSON.parse(message.body);
          console.log('[NotifWS] Match alert received:', match.matchId);
          this.handlers.forEach((h) => h(match));
        } catch (e) {
          console.error('[NotifWS] Failed to parse match:', e);
        }
      }
    );

    console.log('[NotifWS] Subscribed to notifications and matches');
  }

  /**
   * Subscribe to admin broadcasts.
   */
  subscribeToAdmin(onMessage: NotificationHandler): void {
    if (!this.client?.connected) return;

    this.adminSub = this.client.subscribe(
      '/topic/admin',
      (message: IMessage) => {
        try {
          const msg: NotificationWsMessage = JSON.parse(message.body);
          onMessage(msg);
        } catch (e) {
          console.error('[NotifWS] Failed to parse admin message:', e);
        }
      }
    );
  }

  /**
   * Register a handler for incoming notifications.
   */
  onNotification(handler: NotificationHandler): () => void {
    this.handlers.push(handler);

    // Return unsubscribe function
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  /**
   * Disconnect and clean up.
   */
  disconnect(): void {
    this.notificationSub?.unsubscribe();
    this.matchSub?.unsubscribe();
    this.adminSub?.unsubscribe();
    this.notificationSub = null;
    this.matchSub = null;
    this.adminSub = null;
    this.handlers = [];
    this.client?.deactivate();
    this.client = null;
  }

  get isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

// Singleton
export const notifWsClient = new NotificationWsClient();
