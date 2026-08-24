"use client";

import * as React from "react";
import { Bell, MessageCircle, AlertTriangle, CreditCard, Search, Users, ChevronRight, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";

const typeConfig = {
  match: { icon: Search, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  message: { icon: MessageCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  claim: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
  system: { icon: Bell, color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-950/30" },
  payment: { icon: CreditCard, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
  conversation_request: { icon: Users, color: "text-orange-brand", bg: "bg-orange-50 dark:bg-orange-950/30" },
};

interface NotificationItemProps {
  type: "match" | "message" | "claim" | "system" | "payment" | "conversation_request";
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
  onClick?: () => void;
  /** For CONVERSATION_REQUEST: accept handler */
  onAccept?: () => void;
  /** For CONVERSATION_REQUEST: reject handler */
  onReject?: () => void;
  /** Whether accept/reject is in progress */
  actionLoading?: boolean;
  /** If this conversation was already handled */
  actionDone?: "accepted" | "rejected" | null;
  /** Show waiting indicator (for conversation creator) */
  waiting?: boolean;
}

export function NotificationItem({
  type,
  title,
  description,
  read,
  createdAt,
  onClick,
  onAccept,
  onReject,
  actionLoading,
  actionDone,
  waiting,
}: NotificationItemProps) {
  // Normalize type: API returns UPPERCASE, config uses lowercase
  const normalizedType = type?.toLowerCase() as keyof typeof typeConfig;
  const config = typeConfig[normalizedType] || typeConfig.system;
  const Icon = config.icon;
  const isConversationRequest = normalizedType === "conversation_request" && !actionDone && !!(onAccept || onReject);

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 transition-all hover:bg-muted/50",
        !read && "bg-muted/30"
      )}
    >
      {/* Main clickable area */}
      <button
        onClick={onClick}
        className="flex-1 flex items-start gap-3 text-left cursor-pointer group/notif min-w-0"
      >
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", config.bg)}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn("text-sm font-medium", !read && "font-semibold")}>{title}</p>
            {!read && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{description}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(createdAt)}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover/notif:text-muted-foreground transition-colors shrink-0 mt-1" />
      </button>

      {/* Accept/Reject buttons for conversation requests */}
      {isConversationRequest && (
        <div className="flex items-center gap-1.5 shrink-0 mt-1">
          {actionLoading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onAccept?.(); }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-forest/10 hover:bg-forest/20 text-forest dark:bg-forest-light/10 dark:hover:bg-forest-light/20 dark:text-forest-light transition-colors"
                title="Accepter"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onReject?.(); }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:text-red-400 transition-colors"
                title="Refuser"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Waiting indicator for conversation creator */}
      {waiting && !actionDone && (
        <div className="flex items-center gap-1.5 shrink-0 text-xs text-orange-brand font-medium mt-1">
          <Clock className="h-4 w-4 animate-pulse" />
          <span className="hidden sm:inline">En attente</span>
        </div>
      )}

      {/* Done badge for already-handled conversations */}
      {actionDone === "accepted" && (
        <div className="flex items-center gap-1 shrink-0 text-xs text-forest dark:text-forest-light font-medium mt-1">
          <CheckCircle2 className="h-4 w-4" />
          <span className="hidden sm:inline">Accepté</span>
        </div>
      )}
      {actionDone === "rejected" && (
        <div className="flex items-center gap-1 shrink-0 text-xs text-red-500 font-medium mt-1">
          <XCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Refusé</span>
        </div>
      )}
    </div>
  );
}
