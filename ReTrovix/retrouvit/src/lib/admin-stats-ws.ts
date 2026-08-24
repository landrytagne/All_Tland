import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface AdminStats {
  totalUsers: number;
  totalLostObjects: number;
  activeLostObjects: number;
  totalFoundObjects: number;
  activeFoundObjects: number;
  totalMatches: number;
  totalReports: number;
  pendingReports: number;
  escalatedReports: number;
  timestamp: number;
}

type StatsHandler = (stats: AdminStats) => void;

class AdminStatsWsClient {
  private client: Client | null = null;
  private statsSub: any = null;
  private handlers: StatsHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to WebSocket and subscribe to admin stats channel.
   */
  connect(token: string, onConnect?: () => void): void {
    if (this.client?.connected) {
      onConnect?.();
      return;
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS(`/ws?token=${token}`),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        console.log('[AdminWS] Connected');
        this.reconnectAttempts = 0;
        this.subscribeToStats();
        onConnect?.();
      },
      onDisconnect: () => {
        console.log('[AdminWS] Disconnected');
      },
      onStompError: (frame) => {
        console.error('[AdminWS] STOMP error:', frame.headers['message']);
      },
      onWebSocketClose: () => {
        console.log('[AdminWS] WebSocket closed');
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('[AdminWS] Max reconnect attempts reached');
        }
      },
    });

    this.client.activate();
  }

  /**
   * Subscribe to admin stats channel.
   */
  private subscribeToStats(): void {
    if (!this.client?.connected) return;

    this.statsSub = this.client.subscribe(
      '/topic/admin-stats',
      (message: IMessage) => {
        try {
          const stats: AdminStats = JSON.parse(message.body);
          this.handlers.forEach((h) => h(stats));
        } catch (e) {
          console.error('[AdminWS] Failed to parse stats:', e);
        }
      }
    );

    console.log('[AdminWS] Subscribed to admin stats');
  }

  /**
   * Register a handler for stats updates.
   */
  onStats(handler: StatsHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  /**
   * Disconnect and clean up.
   */
  disconnect(): void {
    this.statsSub?.unsubscribe();
    this.statsSub = null;
    this.handlers = [];
    this.client?.deactivate();
    this.client = null;
  }

  get isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

// Singleton
export const adminStatsWsClient = new AdminStatsWsClient();
