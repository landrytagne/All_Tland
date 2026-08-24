"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Plus,
  MessageCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { href: "/feed", label: "Accueil", icon: Home },
  { href: "/feed/lost", label: "Chercher", icon: Search },
  { href: "/publish", label: "Publier", icon: Plus, highlight: true },
  { href: "/messages", label: "Messages", icon: MessageCircle, badge: 2 },
  { href: "/profile", label: "Profil", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Gradient fade */}
      <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <div className="relative bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
        <div className="flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {mobileNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/feed" && pathname.startsWith("/feed")) ||
              (item.href === "/messages" && pathname.startsWith("/messages")) ||
              (item.href === "/profile" && (pathname.startsWith("/profile") || pathname.startsWith("/settings")));

            if (item.highlight) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative -mt-4"
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all",
                      "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium text-primary">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[56px] transition-colors active:scale-95",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -right-1.5 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destruct-foreground">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>

                {/* Active indicator */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
