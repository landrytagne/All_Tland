"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Package,
  MessageCircle,
  TrendingUp,
  MapPin,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  Bell,
  Trophy,
  Wallet,
  Eye,
  Loader2,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/stats-card";
import { StatsGridSkeleton, ObjectCardGridSkeleton, NotificationListSkeleton, Skeleton } from "@/components/skeletons";
import { ObjectCard } from "@/components/object-card";
import { NotificationItem } from "@/components/notification-item";
import { lostObjectsApi, foundObjectsApi, notificationsApi, matchesApi, type LostObjectResponse, type FoundObjectResponse, type NotificationResponse } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const [lostObjects, setLostObjects] = React.useState<LostObjectResponse[]>([]);
  const [foundObjects, setFoundObjects] = React.useState<FoundObjectResponse[]>([]);
  const [notifications, setNotifications] = React.useState<NotificationResponse[]>([]);
  const [matchCount, setMatchCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const displayName = user?.name?.split(" ")[0] || "Utilisateur";

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [lost, found, notifs, matches] = await Promise.allSettled([
          lostObjectsApi.getAll(),
          foundObjectsApi.getAll(),
          notificationsApi.getAll(),
          matchesApi.getAll(),
        ]);

        if (lost.status === "fulfilled") setLostObjects((lost.value.content || []).slice(0, 3));
        if (found.status === "fulfilled") setFoundObjects((found.value.content || []).slice(0, 2));
        if (notifs.status === "fulfilled") setNotifications(notifs.value.slice(0, 4));
        if (matches.status === "fulfilled") setMatchCount(matches.value.length);
      } catch (err) {
        console.warn("Could not fetch dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <MainLayout showSidebar>
      <div className="px-4 py-6 sm:px-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold">
              Bonjour, {displayName} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Voici ce qui se passe sur RetrouvIt aujourd&apos;hui.
            </p>
          </div>
          <Link href="/publish">
            <Button className="hidden sm:flex gap-2 bg-forest hover:bg-forest/90 dark:bg-forest-light dark:hover:bg-forest-light/90 shadow-lg shadow-forest/20 dark:shadow-forest-light/20">
              <Plus className="h-4 w-4" />
              Publier un objet
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-6 animate-fade-in">
            <StatsGridSkeleton count={4} />
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-4 w-12" /></div>
                </div></CardContent></Card>
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-5 w-40" />
                <ObjectCardGridSkeleton count={4} />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-5 w-32" />
                <NotificationListSkeleton count={4} />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
              <StatsCard
                title="Mes objets perdus"
                value={user?.objectsLost || 0}
                icon={Package}
                description="Objets que vous avez déclarés"
              />
              <StatsCard
                title="Mes objets trouvés"
                value={user?.objectsFound || 0}
                icon={Search}
                description="Objets que vous avez retournés"
              />
              <StatsCard
                title="Correspondances"
                value={matchCount}
                icon={TrendingUp}
                change="+2 cette semaine"
                changeType="positive"
                description="Matches actifs"
              />
              <StatsCard
                title="Score de confiance"
                value={`${user?.trustScore || 50}%`}
                icon={Trophy}
                change="+5% ce mois"
                changeType="positive"
                description="Excellent standing"
              />
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-8">
              <Link href="/feed/lost">
                <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30">
                      <Search className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Objets perdus</p>
                      <p className="text-xs text-muted-foreground">Parcourir</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/feed/found">
                <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                      <Package className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Objets trouvés</p>
                      <p className="text-xs text-muted-foreground">Parcourir</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/matching">
                <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Mes matches</p>
                      <p className="text-xs text-muted-foreground">Voir tout</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/wallet">
                <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
                      <Wallet className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Mon portefeuille</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.walletBalance?.toLocaleString() || "0"} FCFA
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Recent Lost Objects */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Objets perdus récents</h2>
                  <Link href="/feed/lost" className="text-sm text-primary hover:underline flex items-center gap-1">
                    Voir tout <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {lostObjects.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {lostObjects.map((obj) => (
                      <ObjectCard
                        key={obj.id}
                        id={String(obj.id)}
                        title={obj.title}
                        description={obj.description}
                        category={obj.category}
                        location={obj.location}
                        date={obj.dateLost}
                        user={{
                          name: obj.user.name,
                          trustScore: obj.user.trustScore || 50,
                          verified: obj.user.verified || false,
                        }}
                        status={obj.status.toLowerCase() as "active" | "matched" | "resolved" | "expired"}
                        reward={obj.reward}
                        views={obj.views}
                        type="lost"
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Aucun objet perdu pour le moment</p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center justify-between mt-6">
                  <h2 className="text-lg font-semibold">Objets trouvés récents</h2>
                  <Link href="/feed/found" className="text-sm text-primary hover:underline flex items-center gap-1">
                    Voir tout <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {foundObjects.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {foundObjects.map((obj) => (
                      <ObjectCard
                        key={obj.id}
                        id={String(obj.id)}
                        title={obj.title}
                        description={obj.description}
                        category={obj.category}
                        location={obj.location}
                        date={obj.dateFound}
                        user={{
                          name: obj.user.name,
                          trustScore: obj.user.trustScore || 50,
                          verified: obj.user.verified || false,
                        }}
                        status={obj.status.toLowerCase() as "active" | "matched" | "returned" | "expired"}
                        views={obj.views}
                        type="found"
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Aucun objet trouvé pour le moment</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Notifications Sidebar */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Notifications</h2>
                  <Link href="/notifications" className="text-sm text-primary hover:underline">
                    Tout voir
                  </Link>
                </div>
                <Card>
                  <CardContent className="p-0 divide-y">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <NotificationItem
                          key={notif.id}
                          type={notif.type as "match" | "message" | "claim" | "system" | "payment"}
                          title={notif.title}
                          description={notif.description}
                          read={notif.read}
                          createdAt={notif.createdAt}
                        />
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Bell className="h-6 w-6 text-muted-foreground/50 mb-2" />
                        <p className="text-xs text-muted-foreground">Aucune notification</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
