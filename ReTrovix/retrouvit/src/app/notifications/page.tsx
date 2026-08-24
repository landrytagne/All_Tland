"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2, Wifi, WifiOff } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationItem } from "@/components/notification-item";
import { NotificationListSkeleton } from "@/components/skeletons";
import { notificationsApi, conversationsApi, type NotificationResponse } from "@/lib/api-chat";
import { useNotifications } from "@/contexts/NotificationContext";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  );
}

function NotificationsContent() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { notifications: wsNotifications, unreadCount: wsUnreadCount, clearNotifications } = useNotifications();
  const [notifications, setNotifications] = React.useState<NotificationResponse[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isConnected, setIsConnected] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<Record<number, boolean>>({});
  const [handledConversations, setHandledConversations] = React.useState<Record<number, "accepted" | "rejected">>({});

  React.useEffect(() => {
    fetchNotifications();
  }, []);

  const allNotifications = React.useMemo(() => {
    const wsNotifs: NotificationResponse[] = wsNotifications.map((n) => ({
      id: n.id || Date.now(),
      type: n.type,
      title: n.title || "",
      description: n.description || "",
      read: false,
      createdAt: n.timestamp ? new Date(n.timestamp).toISOString() : new Date().toISOString(),
    }));

    const existingIds = new Set(notifications.map((n) => n.id));
    const newWsNotifs = wsNotifs.filter((n) => !existingIds.has(n.id));

    // Full dedup by id — keeps the first occurrence
    const seen = new Set<number>();
    return [...newWsNotifs, ...notifications].filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }, [notifications, wsNotifications]);

  const unreadCount = React.useMemo(() => {
    return allNotifications.filter((n) => !n.read).length;
  }, [allNotifications]);

  const fetchNotifications = async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data);
    } catch (err) {
      console.warn("Could not fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      clearNotifications();
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleNotificationClick = async (notif: NotificationResponse) => {
    // Mark as read
    if (!notif.read) {
      try {
        await notificationsApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      } catch (err) {
        console.error("Error marking as read:", err);
      }
    }

    // Navigate based on notification type
    const type = notif.type?.toUpperCase();
    if (type === "CONVERSATION_REQUEST" || type === "MESSAGE") {
      router.push("/messages");
    } else if (type === "MATCH") {
      router.push("/matching");
    } else if (type === "PAYMENT") {
      router.push("/wallet");
    } else {
      router.push("/notifications");
    }
  };

  const handleAcceptConversation = async (notif: NotificationResponse) => {
    const convId = notif.conversationId;
    if (!convId) {
      router.push("/messages");
      return;
    }
    setActionLoading((prev) => ({ ...prev, [notif.id]: true }));
    try {
      await conversationsApi.accept(convId);
      setHandledConversations((prev) => ({ ...prev, [convId]: "accepted" }));
      // Mark as read
      if (!notif.read) {
        await notificationsApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      }
    } catch (err) {
      console.error("Failed to accept:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [notif.id]: false }));
    }
  };

  const handleRejectConversation = async (notif: NotificationResponse) => {
    const convId = notif.conversationId;
    if (!convId) {
      router.push("/messages");
      return;
    }
    setActionLoading((prev) => ({ ...prev, [notif.id]: true }));
    try {
      await conversationsApi.reject(convId);
      setHandledConversations((prev) => ({ ...prev, [convId]: "rejected" }));
      // Mark as read
      if (!notif.read) {
        await notificationsApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      }
    } catch (err) {
      console.error("Failed to reject:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [notif.id]: false }));
    }
  };

  const filteredNotifications = (filter: string) => {
    if (filter === "all") return allNotifications;
    if (filter === "unread") return allNotifications.filter((n) => !n.read);
    return allNotifications.filter((n) => n.type.toLowerCase() === filter);
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              {t("notifications.title")}
              {unreadCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({unreadCount} {t("messages.unread").toLowerCase()})
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isConnected ? "bg-green-500" : "bg-red-500"
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  {isConnected ? t("messages.online") : t("messages.offline")}
                </p>
              </div>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1">
              <Check className="h-3 w-3" />
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>

        {wsNotifications.length > 0 && (
          <Card className="mb-4 border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary animate-pulse" />
                <p className="text-sm font-medium">
                  {wsNotifications.length} {t("notifications.title").toLowerCase()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <NotificationListSkeleton count={5} />
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="all">
                {t("feed.all")} ({allNotifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread">
                {t("messages.unread")} ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="match">{t("notifications.match")}</TabsTrigger>
              <TabsTrigger value="message">{t("notifications.message")}</TabsTrigger>
              <TabsTrigger value="conversation_request">
                💬 {locale === "fr" ? "Demandes" : "Requests"}
              </TabsTrigger>
            </TabsList>

            {["all", "unread", "match", "message", "conversation_request"].map((filter) => (
              <TabsContent key={filter} value={filter}>
                <Card>
                  <CardContent className="p-0 divide-y">
                    {filteredNotifications(filter).length > 0 ? (
                      filteredNotifications(filter).map((notif) => (
                        <NotificationItem
                          key={notif.id}
                          type={notif.type as "match" | "message" | "claim" | "system" | "payment" | "conversation_request"}
                          title={notif.title}
                          description={notif.description}
                          read={notif.read}
                          createdAt={notif.createdAt}
                          onClick={() => handleNotificationClick(notif)}
                          onAccept={notif.type?.toUpperCase() === "CONVERSATION_REQUEST" && notif.createdByUserId != null && notif.createdByUserId !== currentUser?.id ? () => handleAcceptConversation(notif) : undefined}
                          onReject={notif.type?.toUpperCase() === "CONVERSATION_REQUEST" && notif.createdByUserId != null && notif.createdByUserId !== currentUser?.id ? () => handleRejectConversation(notif) : undefined}
                          actionLoading={actionLoading[notif.id] || false}
                          actionDone={notif.conversationId ? (handledConversations[notif.conversationId] || null) : null}
                          waiting={notif.type?.toUpperCase() === "CONVERSATION_REQUEST" && notif.createdByUserId === currentUser?.id}
                        />
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">{t("notifications.noNotifications")}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
