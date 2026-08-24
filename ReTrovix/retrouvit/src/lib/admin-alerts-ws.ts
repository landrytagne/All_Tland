import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export interface AdminAlert {
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

type AlertHandler = (alerts: AdminAlert[]) => void;

class AdminAlertsWsClient {
  private client: Client | null = null;
  private sub: any = null;
  private handlers: AlertHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string, onConnect?: () => void): void {
    if (this.client?.connected) {
      onConnect?.();
      return;
    }

    this.client = new Client({
      webSocketFactory: () =>
        new SockJS(`/ws?token=${token}`),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        console.log("[AdminAlertsWS] Connected");
        this.reconnectAttempts = 0;
        this.subscribe();
        onConnect?.();
      },
      onDisconnect: () => {
        console.log("[AdminAlertsWS] Disconnected");
      },
      onStompError: (frame) => {
        console.error(
          "[AdminAlertsWS] STOMP error:",
          frame.headers["message"]
        );
      },
      onWebSocketClose: () => {
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.warn("[AdminAlertsWS] Max reconnect attempts reached – disabling reconnection");
          this.client?.deactivate();
        }
      },
    });

    this.client.activate();
  }

  private subscribe(): void {
    if (!this.client?.connected) return;

    this.sub = this.client.subscribe("/topic/admin", (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        if (data.type === "ADMIN_ALERT" && data.alerts) {
          this.handlers.forEach((h) => h(data.alerts));
        }
      } catch (e) {
        console.error("[AdminAlertsWS] Parse error:", e);
      }
    });

    console.log("[AdminAlertsWS] Subscribed to /topic/admin");
  }

  onAlerts(handler: AlertHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  disconnect(): void {
    this.sub?.unsubscribe();
    this.sub = null;
    this.handlers = [];
    this.client?.deactivate();
    this.client = null;
  }

  get isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

export const adminAlertsWsClient = new AdminAlertsWsClient();
