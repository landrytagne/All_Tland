"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  Menu,
  MapPin,
  Plus,
  LogOut,
  Settings,
  User,
  Home,
  Package,
  TrendingUp,
  Wallet,
  MessageCircle,
  ChevronRight,
  HelpCircle,
  Trophy,
  Bell as BellIcon,
  PackageCheck,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, getAvatarUrl } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { useNotifications } from "@/contexts/NotificationContext";

const navLinks = [
  { href: "/feed", label: "Fil d\u2019actualité" },
  { href: "/feed/lost", label: "Objets perdus" },
  { href: "/feed/found", label: "Objets trouvés" },
  { href: "/matching", label: "Correspondances" },
];

const drawerLinks = [
  { section: "Navigation", items: [
    { href: "/feed", label: "Fil d\u2019actualité", icon: Home },
    { href: "/feed/lost", label: "Objets perdus", icon: Search },
    { href: "/feed/found", label: "Objets trouvés", icon: Package },
    { href: "/dashboard", label: "Tableau de bord", icon: TrendingUp },
    { href: "/matching", label: "Correspondances", icon: TrendingUp },
  ]},
  { section: "Mon compte", items: [
    { href: "/messages", label: "Messagerie", icon: MessageCircle },
    { href: "/notifications", label: "Notifications", icon: BellIcon },
    { href: "/returns", label: "Restitutions", icon: PackageCheck },
    { href: "/wallet", label: "Portefeuille", icon: Wallet, extra: "45 000 FCFA" },
    { href: "/leaderboard", label: "Classement", icon: Trophy },
  ]},
  { section: "Paramètres", items: [
    { href: "/profile", label: "Mon profil", icon: User },
    { href: "/settings", label: "Paramètres", icon: Settings },
    { href: "/certification", label: "Certification", icon: ShieldCheck },
    { href: "/help", label: "Aide", icon: HelpCircle },
  ]},
];

const API_BASE_URL = "";

export function Navbar() {
  const pathname = usePathname();
  const { user, token, logout, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const { unreadCount, unreadMessageCount, totalBadgeCount, notifications, clearNotifications, refreshUnreadCount } = useNotifications();
  const displayName = user?.name || "Utilisateur";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
        {/* Mobile Menu Trigger */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 mr-2">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex h-full flex-col">
              {/* User Profile Header */}
              <div className="p-4 pb-3 bg-muted/30">
                <div className="flex items-center gap-3">                    <Avatar className="h-11 w-11">
                    <AvatarImage src={getAvatarUrl(user?.avatar)} alt={displayName} />
                    <AvatarFallback className="text-sm font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] text-muted-foreground">Score : {user?.trustScore || 50}%</span>
                    </div>
                  </div>
                </div>

                {/* Wallet quick access */}
                <Link
                  href="/wallet"
                  className="mt-3 flex items-center justify-between p-2.5 rounded-lg bg-background border"
                  onClick={() => setDrawerOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-medium">Mon portefeuille</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold">{formatCurrency(user?.walletBalance || 0)}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </Link>
              </div>

              {/* Navigation Links */}
              <ScrollArea className="flex-1 py-2">
                {drawerLinks.map((group, gi) => (
                  <div key={group.section} className={cn(gi > 0 && "mt-2")}>
                    <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.section}
                    </p>
                    {group.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href === "/feed/lost" && pathname.startsWith("/feed")) ||
                        (item.href === "/messages" && pathname.startsWith("/messages")) ||
                        (item.href === "/profile" && (pathname.startsWith("/profile") || pathname.startsWith("/settings")));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setDrawerOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                            isActive
                              ? "bg-primary/5 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {item.href === "/notifications" && unreadCount > 0 && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-brand px-1.5 text-[10px] font-bold text-white animate-pulse">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          )}
                          {item.href === "/messages" && unreadMessageCount > 0 && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-forest dark:bg-forest-light px-1.5 text-[10px] font-bold text-white animate-pulse">
                              {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                            </span>
                          )}
                          {item.extra && (
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                              {item.extra}
                            </span>
                          )}
                          {!item.extra && isActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </ScrollArea>

              {/* Footer */}
              <div className="border-t p-3 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-muted-foreground">Thème</span>
                  <ThemeToggle showLabel />
                </div>
                <Separator />
                <button
                  className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  onClick={() => { logout(); setDrawerOpen(false); }}
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <MapPin className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="hidden font-bold sm:inline-block">RetrouvIt</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === link.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex flex-1 items-center justify-end space-x-2">
          {/* Search */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Rechercher</span>
          </Button>

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell className={cn("h-4 w-4 transition-all", unreadCount > 0 && "animate-bounce")} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-brand px-1 text-[9px] font-bold text-white ring-2 ring-background animate-pulse">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {unreadMessageCount > 0 && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-forest dark:bg-forest-light px-1 text-[9px] font-bold text-white ring-2 ring-background animate-pulse">
                    {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end" forceMount>
              <DropdownMenuLabel className="flex items-center justify-between">
                <span className="font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
                          method: "PUT",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                      } catch {}
                      clearNotifications();
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Tout marquer lu
                  </button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="p-4 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Aucune notification</p>
                </div>
              ) : (
                <ScrollArea className="max-h-80">
                  {notifications.slice(0, 10).map((notif, i) => (
                    <DropdownMenuItem key={i} className="flex items-start gap-2 p-3 cursor-default">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        notif.type === "MATCH" ? "bg-emerald-500/10" :
                        notif.type === "PAYMENT" ? "bg-amber-500/10" :
                        notif.type === "CLAIM" ? "bg-red-500/10" :
                        notif.type === "MESSAGE" ? "bg-blue-500/10" : "bg-muted"
                      )}>
                        {notif.type === "MATCH" ? <Trophy className="h-4 w-4 text-emerald-500" /> :
                         notif.type === "PAYMENT" ? <Trophy className="h-4 w-4 text-amber-500" /> :
                         notif.type === "CLAIM" ? <AlertCircle className="h-4 w-4 text-red-500" /> :
                         notif.type === "MESSAGE" ? <MessageCircle className="h-4 w-4 text-blue-500" /> :
                         <Bell className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-none mb-0.5">{notif.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{notif.description}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="justify-center">
                <Link href="/notifications" className="text-xs text-primary font-medium">
                  Voir toutes les notifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* New Publication */}
          <Link href="/publish" className="hidden sm:block">
            <Button size="sm" className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Publier</span>
            </Button>
          </Link>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">                    <AvatarImage src={getAvatarUrl(user?.avatar)} alt={displayName} />
                  <AvatarFallback className="text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    {user?.verified && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        ✓ Vérifié
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || ""}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Mon profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search Bar */}
      {searchOpen && (
        <div className="border-t bg-background p-4">
          <div className="mx-auto max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un objet perdu ou trouvé..."
                className="pl-9 h-10"
                autoFocus
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
