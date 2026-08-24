"use client";

import * as React from "react";
import { notifWsClient, type NotificationWsMessage } from "@/lib/notifications-ws";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = "";

interface NotificationContextType {
  notifications: NotificationWsMessage[];
  /** Total unread notification count */
  unreadCount: number;
  /** Total unread message count across conversations */
  unreadMessageCount: number;
  /** Combined badge count (notifications + messages) */
  totalBadgeCount: number;
  clearNotifications: () => void;
  refreshUnreadCount: () => void;
  refreshUnreadMessageCount: () => void;
}

const NotificationContext = React.createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  unreadMessageCount: 0,
  totalBadgeCount: 0,
  clearNotifications: () => {},
  refreshUnreadCount: () => {},
  refreshUnreadMessageCount: () => {},
});

export function useNotifications() {
  return React.useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = React.useState<NotificationWsMessage[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = React.useState(0);
  const totalBadgeCount = unreadCount + unreadMessageCount;

  /** Fetch unread count from the REST API */
  const refreshUnreadCount = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/unread/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch {
      // Silent fail — will retry on next interval
    }
  }, [token]);

  // Fetch unread count on mount and poll every 30 seconds
  React.useEffect(() => {
    if (!token) return;
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [token, refreshUnreadCount]);

  // Connect to notification WebSocket
  React.useEffect(() => {
    if (token) {
      notifWsClient.connect(token);
      return () => {
        notifWsClient.disconnect();
      };
    }
  }, [token]);

  // Register notification handler
  React.useEffect(() => {
    const unsubscribe = notifWsClient.onNotification((message) => {
      // Add to notifications list, deduplicating by id to avoid duplicates on WS reconnect
      setNotifications((prev) => {
        if (message.id && prev.some((n) => n.id === message.id)) return prev;
        return [message, ...prev].slice(0, 50);
      });
      // Increment unread count immediately for snappy UI
      setUnreadCount((prev) => prev + 1);

      // Show browser notification if permitted
      if ("Notification" in window && Notification.permission === "granted") {
        const title =
          message.type === "MATCH"
            ? "🔔 Nouvelle correspondance !"
            : message.type === "CONVERSATION_REQUEST"
              ? "💬 Demande de discussion"
              : message.title || "Notification";
        const body = message.description || "";
        new window.Notification(title, { body, icon: "/favicon.ico" });
      }
    });

    return unsubscribe;
  }, []);

  /** Fetch unread message count from the REST API */
  const refreshUnreadMessageCount = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations/unread/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadMessageCount(data.count ?? 0);
      }
    } catch {
      // Silent fail
    }
  }, [token]);

  // Fetch unread message count on mount and poll every 30 seconds
  React.useEffect(() => {
    if (!token) return;
    refreshUnreadMessageCount();
    const interval = setInterval(refreshUnreadMessageCount, 30000);
    return () => clearInterval(interval);
  }, [token, refreshUnreadMessageCount]);

  const clearNotifications = React.useCallback(() => {
    setNotifications([]);
    // Re-fetch from DB instead of just zeroing out
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Request browser notification permission on mount
  React.useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, unreadMessageCount, totalBadgeCount, clearNotifications, refreshUnreadCount, refreshUnreadMessageCount }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
