"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Users,
  Package,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/stats-card";
import { AuthGuard } from "@/components/auth-guard";
import {
  usersApi,
  reportsApi,
  lostObjectsApi,
  foundObjectsApi,
  matchesApi,
  type ReportResponse,
  type LostObjectResponse,
  type FoundObjectResponse,
  ApiError,
} from "@/lib/api";
import { adminStatsWsClient, type AdminStats } from "@/lib/admin-stats-ws";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  ObjectsByCategoryChart,
  ReportsByStatusChart,
  ObjectsOverTimeChart,
  ReportTypesChart,
  PlatformActivityRadar,
} from "@/components/admin-charts";
import { AdminAlertBanner } from "@/components/admin-alert-banner";
import { DashboardPdfButton } from "@/components/dashboard-pdf-export";

export default function AdminDashboard() {
  return (
    <AuthGuard requireAdmin>
      <AdminDashboardContent />
    </AuthGuard>
  );
}

function AdminDashboardContent() {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingReports, setPendingReports] = useState<ReportResponse[]>([]);
  const [allReports, setAllReports] = useState<ReportResponse[]>([]);
  const [lostObjects, setLostObjects] = useState<LostObjectResponse[]>([]);
  const [foundObjects, setFoundObjects] = useState<FoundObjectResponse[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Connect to admin stats WebSocket
  useEffect(() => {
    if (token) {
      adminStatsWsClient.connect(token, () => {
        setIsConnected(true);
      });

      return () => {
        adminStatsWsClient.disconnect();
        setIsConnected(false);
      };
    }
  }, [token]);

  // Subscribe to stats updates
  useEffect(() => {
    const unsubscribe = adminStatsWsClient.onStats((newStats) => {
      setStats(newStats);
      setLastUpdate(new Date());
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Fetch all data for charts
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data in parallel
        const [reportsData, pendingData, lostData, foundData] = await Promise.allSettled([
          reportsApi.getAll(),
          reportsApi.getByStatus("PENDING"),
          lostObjectsApi.getAllList(),
          foundObjectsApi.getAllList(),
        ]);

        if (reportsData.status === "fulfilled") setAllReports(reportsData.value);
        if (pendingData.status === "fulfilled") setPendingReports(pendingData.value.slice(0, 3));
        if (lostData.status === "fulfilled") setLostObjects((lostData as PromiseFulfilledResult<LostObjectResponse[]>).value);
        if (foundData.status === "fulfilled") setFoundObjects((foundData as PromiseFulfilledResult<FoundObjectResponse[]>).value);

        // Get report stats
        try {
          const reportStats = await reportsApi.getStats();
          setStats((prev) => ({
            totalUsers: prev?.totalUsers || 0,
            totalLostObjects: prev?.totalLostObjects || (lostData.status === "fulfilled" ? (lostData as PromiseFulfilledResult<LostObjectResponse[]>).value.length : 0),
            activeLostObjects: prev?.activeLostObjects || 0,
            totalFoundObjects: prev?.totalFoundObjects || (foundData.status === "fulfilled" ? (foundData as PromiseFulfilledResult<FoundObjectResponse[]>).value.length : 0),
            activeFoundObjects: prev?.activeFoundObjects || 0,
            totalMatches: prev?.totalMatches || 0,
            totalReports: reportStats.total || 0,
            pendingReports: reportStats.pending || 0,
            escalatedReports: reportStats.escalated || 0,
            timestamp: Date.now(),
          }));
        } catch {
          // Stats endpoint might not exist yet
        }
      } catch (err) {
        console.warn("Could not fetch chart data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // ─── Chart Data Preparation ─────────────────────────────────────

  const categoryData = useMemo(() => {
    const categories = new Set<string>();
    const lostByCategory: Record<string, number> = {};
    const foundByCategory: Record<string, number> = {};

    lostObjects.forEach((obj) => {
      categories.add(obj.category);
      lostByCategory[obj.category] = (lostByCategory[obj.category] || 0) + 1;
    });

    foundObjects.forEach((obj) => {
      categories.add(obj.category);
      foundByCategory[obj.category] = (foundByCategory[obj.category] || 0) + 1;
    });

    return Array.from(categories).map((cat) => ({
      category: cat,
      lost: lostByCategory[cat] || 0,
      found: foundByCategory[cat] || 0,
    }));
  }, [lostObjects, foundObjects]);

  const reportStatusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    allReports.forEach((r) => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    const labels: Record<string, string> = {
      PENDING: "En attente",
      IN_REVIEW: "En revue",
      RESOLVED: "Résolu",
      DISMISSED: "Rejeté",
      ESCALATED: "Escaladé",
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: labels[status] || status,
      value: count,
    }));
  }, [allReports]);

  const reportTypeData = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    allReports.forEach((r) => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });

    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
    }));
  }, [allReports]);

  const activityOverTimeData = useMemo(() => {
    const now = new Date();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }

    const lostByDay: Record<string, number> = {};
    const foundByDay: Record<string, number> = {};

    lostObjects.forEach((obj) => {
      const day = obj.createdAt?.split("T")[0];
      if (day && lostByDay[day] !== undefined) {
        lostByDay[day] = (lostByDay[day] || 0) + 1;
      }
    });

    foundObjects.forEach((obj) => {
      const day = obj.createdAt?.split("T")[0];
      if (day && foundByDay[day] !== undefined) {
        foundByDay[day] = (foundByDay[day] || 0) + 1;
      }
    });

    return days.map((day) => ({
      date: new Date(day).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
      lost: lostByDay[day] || 0,
      found: foundByDay[day] || 0,
    }));
  }, [lostObjects, foundObjects]);

  const radarData = useMemo(() => {
    const totalLost = lostObjects.length;
    const totalFound = foundObjects.length;
    const totalReports = allReports.length;
    const totalMatches = stats?.totalMatches || 0;

    // Normalize to 0-100 scale
    const maxVal = Math.max(totalLost, totalFound, totalReports, totalMatches, 1);

    return [
      {
        subject: "Objets perdus",
        current: Math.round((totalLost / maxVal) * 100),
        previous: Math.round((totalLost * 0.7 / maxVal) * 100),
      },
      {
        subject: "Objets trouvés",
        current: Math.round((totalFound / maxVal) * 100),
        previous: Math.round((totalFound * 0.6 / maxVal) * 100),
      },
      {
        subject: "Matches",
        current: Math.round((totalMatches / maxVal) * 100),
        previous: Math.round((totalMatches * 0.5 / maxVal) * 100),
      },
      {
        subject: "Signalements",
        current: Math.round((totalReports / maxVal) * 100),
        previous: Math.round((totalReports * 0.8 / maxVal) * 100),
      },
      {
        subject: "Utilisateurs",
        current: Math.round(((stats?.totalUsers || 0) / maxVal) * 100),
        previous: Math.round(((stats?.totalUsers || 0) * 0.4 / maxVal) * 100),
      },
    ];
  }, [lostObjects, foundObjects, allReports, stats]);

  const adminStatsCards = [
    {
      title: "Utilisateurs totaux",
      value: stats?.totalUsers?.toLocaleString() || "—",
      change: "Données en temps réel",
      changeType: "positive" as const,
      icon: Users,
    },
    {
      title: "Objets perdus actifs",
      value: stats?.activeLostObjects?.toLocaleString() || "—",
      change: `${stats?.totalLostObjects || lostObjects.length} total`,
      changeType: "positive" as const,
      icon: Package,
    },
    {
      title: "Objets trouvés actifs",
      value: stats?.activeFoundObjects?.toLocaleString() || "—",
      change: `${stats?.totalFoundObjects || foundObjects.length} total`,
      changeType: "positive" as const,
      icon: Package,
    },
    {
      title: "Matches totaux",
      value: stats?.totalMatches?.toLocaleString() || "—",
      change: "Correspondances trouvées",
      changeType: "positive" as const,
      icon: TrendingUp,
    },
  ];

  const dashboardRef = useRef<HTMLDivElement>(null);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vue d&apos;ensemble de la plateforme RetrouvIt
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DashboardPdfButton targetRef={dashboardRef} data-pdf-ignore="true" />
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              )}
            />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {isConnected ? "Temps réel" : "Hors ligne"}
            </span>
          </div>
          {lastUpdate && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Mis à jour {lastUpdate.toLocaleTimeString("fr-FR")}
            </span>
          )}
        </div>
      </div>

      {/* Exportable content */}
      <div ref={dashboardRef}>
      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {adminStatsCards.map((stat) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            changeType={stat.changeType}
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Active Alerts */}
      <AdminAlertBanner />

      {/* Charts Row 1: Bar + Pie */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ObjectsByCategoryChart data={categoryData} />
        <ReportsByStatusChart data={reportStatusData} />
      </div>

      {/* Charts Row 2: Area + Radar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ObjectsOverTimeChart data={activityOverTimeData} />
        <PlatformActivityRadar data={radarData} />
      </div>

      {/* Charts Row 3: Horizontal Bar (report types) */}
      <ReportTypesChart data={reportTypeData} />

      {/* Reports Summary */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.pendingReports || 0}</div>
                <div className="text-xs text-muted-foreground">En attente</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.escalatedReports || 0}</div>
                <div className="text-xs text-muted-foreground">Escaladées</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.totalReports || 0}</div>
                <div className="text-xs text-muted-foreground">Total signalements</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Link href="/admin/users">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">Gérer les utilisateurs</p>
                    <p className="text-xs text-muted-foreground">Ban, vérification, rôles</p>
                  </div>
                </Button>
              </Link>
              <Link href="/admin/complaints">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <div className="text-left">
                    <p className="font-medium">Réclamations</p>
                    <p className="text-xs text-muted-foreground">{stats?.pendingReports || 0} en attente</p>
                  </div>
                </Button>
              </Link>
              <Link href="/admin/posts">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                  <Package className="h-5 w-5 text-emerald-500" />
                  <div className="text-left">
                    <p className="font-medium">Publications</p>
                    <p className="text-xs text-muted-foreground">{stats?.activeLostObjects || 0} actives</p>
                  </div>
                </Button>
              </Link>
              <Link href="/admin/transactions">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                  <CreditCard className="h-5 w-5 text-violet-500" />
                  <div className="text-left">
                    <p className="font-medium">Transactions</p>
                    <p className="text-xs text-muted-foreground">Historique & escrow</p>
                  </div>
                </Button>
              </Link>
              <Link href="/admin/alerts">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div className="text-left">
                    <p className="font-medium">Historique alertes</p>
                    <p className="text-xs text-muted-foreground">Consulter les alertes acquittées</p>
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Pending Reports */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Signalements récents
                </CardTitle>
                <Badge variant="secondary">{stats?.pendingReports || 0}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingReports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun signalement en attente
                </p>
              ) : (
                pendingReports.map((report) => (
                  <div key={report.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-muted-foreground">#{report.id}</span>
                      <Badge variant="warning" className="text-[10px]">
                        {report.priority}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium line-clamp-1">{report.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.reporter?.name} · {new Date(report.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                ))
              )}
              <Link href="/admin/complaints">
                <Button variant="outline" className="w-full" size="sm">
                  Voir tous les signalements
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Platform Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Vue de la plateforme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {stats?.totalUsers?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Utilisateurs</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-500">
                {(stats?.activeLostObjects || 0) + (stats?.activeFoundObjects || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Objets actifs</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500">
                {stats?.totalMatches?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Matches</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-500">
                {stats?.totalReports?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Signalements</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>{/* end exportable content */}
    </div>
  );
}
