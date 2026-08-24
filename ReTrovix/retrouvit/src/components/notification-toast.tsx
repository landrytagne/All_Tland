"use client";

import * as React from "react";
import { Bell, X, Trophy, MessageCircle, AlertCircle, AlertTriangle, CheckCircle2, PackageCheck } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";

const typeConfig: Record<
  string,
  { icon: React.ElementType; color: string; ring: string; label: string }
> = {
  MATCH: {
    icon: Trophy,
    color: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    label: "Match",
  },
  NOTIFICATION: {
    icon: Bell,
    color: "bg-forest dark:bg-forest-light",
    ring: "ring-forest/30 dark:ring-forest-light/30",
    label: "Notification",
  },
  MESSAGE: {
    icon: MessageCircle,
    color: "bg-orange-brand",
    ring: "ring-orange-brand/30",
    label: "Message",
  },
  CLAIM: {
    icon: AlertCircle,
    color: "bg-amber-500",
    ring: "ring-amber-500/30",
    label: "Réclamation",
  },
  ADMIN_ALERT: {
    icon: AlertTriangle,
    color: "bg-red-500",
    ring: "ring-red-500/30",
    label: "Alerte",
  },
  SUCCESS: {
    icon: CheckCircle2,
    color: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    label: "Succès",
  },
  RETURN: {
    icon: PackageCheck,
    color: "bg-blue-500",
    ring: "ring-blue-500/30",
    label: "Restitution",
  },
  PAYMENT: {
    icon: Trophy,
    color: "bg-amber-500",
    ring: "ring-amber-500/30",
    label: "Paiement",
  },
  CONVERSATION_REQUEST: {
    icon: MessageCircle,
    color: "bg-orange-brand",
    ring: "ring-orange-brand/30",
    label: "Demande de discussion",
  },
};

interface ToastItem {
  id: number;
  title: string;
  description: string;
  type: string;
  entering: boolean;
  exiting: boolean;
}

export function NotificationToast() {
  const { notifications } = useNotifications();
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  // Show toast for new notifications
  React.useEffect(() => {
    if (notifications.length === 0) return;

    const latest = notifications[0];
    if (!latest || toasts.some((t) => t.id === latest.id)) return;

    const newToast: ToastItem = {
      id: latest.id || Date.now(),
      title: latest.title || "Notification",
      description: latest.description || "",
      type: latest.type || "NOTIFICATION",
      entering: true,
      exiting: false,
    };

    // Add with entering animation
    setToasts((prev) => [...prev.slice(-4), newToast]);

    // Mark as entered after animation
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === newToast.id ? { ...t, entering: false } : t))
      );
    }, 50);

    // Start exit animation after 4.5s
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === newToast.id ? { ...t, exiting: true } : t))
      );
    }, 4500);

    // Remove after exit animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5000);
  }, [notifications, toasts]);

  const removeToast = (id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast, index) => {
        const config = typeConfig[toast.type] || typeConfig.NOTIFICATION;
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto",
              "bg-card border rounded-xl shadow-2xl overflow-hidden",
              "transition-all duration-300 ease-out",
              toast.exiting
                ? "opacity-0 translate-x-full scale-95"
                : toast.entering
                  ? "opacity-0 translate-x-8 scale-95"
                  : "opacity-100 translate-x-0 scale-100"
            )}
            style={{
              animationDelay: `${index * 60}ms`,
            }}
          >
            {/* Colored top accent */}
            <div className={cn("h-0.5", config.color)} />

            <div className="flex items-start gap-3 p-4">
              {/* Icon with pulse ring */}
              <div className="relative shrink-0">
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    config.color,
                    "ring-4",
                    config.ring
                  )}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                {/* Pulse effect on enter */}
                {!toast.exiting && (
                  <div
                    className={cn(
                      "absolute inset-0 rounded-full animate-ping opacity-30",
                      config.color
                    )}
                    style={{ animationDuration: "1s" }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-semibold text-foreground">
                  {toast.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {toast.description}
                </p>
                {/* Timestamp */}
                <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                  À l&apos;instant
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={() => removeToast(toast.id)}
                className={cn(
                  "shrink-0 h-6 w-6 rounded-full flex items-center justify-center",
                  "text-muted-foreground hover:text-foreground hover:bg-muted",
                  "transition-all duration-200",
                  "opacity-0 group-hover:opacity-100 focus:opacity-100",
                  "mt-0.5"
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-muted mx-4 mb-3 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", config.color)}
                style={{
                  animation: toast.exiting
                    ? "none"
                    : "toast-progress 4.5s linear forwards",
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Inline keyframes */}
      <style jsx global>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
