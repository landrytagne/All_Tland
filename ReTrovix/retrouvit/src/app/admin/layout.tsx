"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  AlertTriangle,
  CreditCard,
  MessageCircle,
  Settings,
  BarChart3,
  Shield,
  Bell,
  ChevronLeft,
  ChevronRight,
  MapPin,
  LogOut,
  FileText,
  Map,
  Globe,
  Link as LinkIcon,
  BookOpen,
  Headphones,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const sidebarItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/posts", label: "Publications", icon: FileText },
  { href: "/admin/reports", label: "Signalements", icon: AlertTriangle },
  { href: "/admin/certifications", label: "Certifications", icon: ShieldCheck },
  { href: "/admin/complaints", label: "Réclamations", icon: Headphones },
  { href: "/admin/transactions", label: "Transactions", icon: CreditCard },
  { href: "/admin/messages", label: "Messages", icon: MessageCircle },
  { href: "/admin/categories", label: "Catégories", icon: Package },
  { href: "/admin/cities", label: "Villes", icon: Map },
  { href: "/admin/roles", label: "Rôles", icon: Shield },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r bg-muted/30 transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          {!collapsed && (
            <Link href="/admin" className="flex items-center space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <MapPin className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm">Admin</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-2">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;
              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }
              return link;
            })}
          </nav>
        </ScrollArea>

        {/* Back to app */}
        <div className="border-t p-2">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Retour à l&apos;app</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b bg-background px-4">
          <div>
            <h1 className="text-sm font-semibold">Administration</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-medium text-destructive-foreground">
                3
              </span>
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">LT</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
