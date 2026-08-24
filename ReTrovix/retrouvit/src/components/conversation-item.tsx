"use client";

import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";

interface ConversationItemProps {
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  onClick?: () => void;
}

export function ConversationItem({
  name,
  avatar,
  lastMessage,
  lastMessageAt,
  unread,
  onClick,
}: ConversationItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 rounded-lg",
        unread > 0 && "bg-muted/20"
      )}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className="text-sm">{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={cn("text-sm", unread > 0 ? "font-semibold" : "font-medium")}>{name}</p>
          <span className="text-[11px] text-muted-foreground">{formatRelativeTime(lastMessageAt)}</span>
        </div>
        <p className={cn("text-sm truncate", unread > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
          {lastMessage}
        </p>
      </div>
      {unread > 0 && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {unread}
        </span>
      )}
    </button>
  );
}
