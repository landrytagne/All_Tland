"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Package,
  TrendingUp,
  MessageCircle,
  Bell,
  Wallet,
  User,
  Settings,
  Trophy,
  HelpCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { mockUser, mockNotifications } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

const sidebarNav = [
  { href: "/dashboard", label: "Tableau de bord", icon: Home },
  { href: "/feed/lost", label: "Objets perdus", icon: Search },
  { href: "/feed/found", label: "Objets trouvés", icon: Package },
  { href: "/matching", label: "Correspondances", icon: TrendingUp },
  { section: "Communication" },
  { href: "/messages", label: "Messagerie", icon: MessageCircle, badge: 2 },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: 3 },
  { section: "Finance" },
  { href: "/wallet", label: "Portefeuille", icon: Wallet },
  { href: "/leaderboard", label: "Classement", icon: Trophy },
  { section: "Compte" },
  { href: "/profile", label: "Mon profil", icon: User },
  { href: "/settings", label: "Paramètres", icon: Settings },
  { href: "/help", label: "Aide", icon: HelpCircle },
];

interface DesktopSidebarProps {
  className?: string;
}

export function DesktopSidebar({ className }: DesktopSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-muted/20 transition-all duration-300 sticky top-14 h-[calc(100vh-3.5rem)]",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      <div className="flex items-center justify-end p-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* User mini profile */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <Link
            href="/profile"
            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
              <AvatarFallback className="text-xs">
                {mockUser.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{mockUser.name}</p>
              <p className="text-[10px] text-muted-foreground">Score: {mockUser.trustScore}%</p>
            </div>
          </Link>
        </div>
      )}

      {collapsed && (
        <div className="flex justify-center pb-2">
          <Link href="/profile">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {mockUser.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      )}

      <Separator />

      {/* Nav */}
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-0.5 px-2">
          {sidebarNav.map((item, i) => {
            if ("section" in item && item.section) {
              if (collapsed) return <Separator key={i} className="my-2" />;
              return (
                <p key={i} className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.section}
                </p>
              );
            }

            if (!item.href || !item.icon || !item.label) return null;

            const href = item.href;
            const Icon = item.icon;
            const label = item.label;
            const badge = item.badge;
            const isActive =
              pathname === href ||
              (href === "/feed/lost" && pathname.startsWith("/feed")) ||
              (href === "/messages" && pathname.startsWith("/messages")) ||
              (href === "/profile" && (pathname.startsWith("/profile") || pathname.startsWith("/settings")));

            const link = (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="flex-1">{label}</span>}
                {!collapsed && badge && badge > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-bold text-primary">
                    {badge}
                  </span>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={href} delayDuration={0}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </nav>
      </ScrollArea>

      {/* Wallet */}
      {!collapsed && (
        <div className="border-t p-2">
          <Link
            href="/wallet"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <Wallet className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground">Portefeuille</p>
              <p className="text-xs font-bold">{formatCurrency(45000)}</p>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}
