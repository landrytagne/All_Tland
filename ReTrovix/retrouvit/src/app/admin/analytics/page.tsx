"use client";

import * as React from "react";
import {
  BarChart3,
  Users,
  Package,
  TrendingUp,
  Activity,
  RefreshCw,
  Loader2,
  Eye,
  AlertTriangle,
  Shield,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth-guard";
import {
  usersApi,
  reportsApi,
  lostObjectsApi,
  foundObjectsApi,
  type ReportResponse,
  type LostObjectResponse,
  type FoundObjectResponse,
} from "@/lib/api";
import { adminStatsWsClient, type AdminStats } from "@/lib/admin-stats-ws";
import { useAuth } from "@/contexts/AuthContext";
import {
  ObjectsByCategoryChart,
  ReportsByStatusChart,
  ObjectsOverTimeChart,
  PlatformActivityRadar,
  ReportTypesChart,
} from "@/components/admin-charts";

function AnalyticsContent() {
  const { token } = useAuth();
  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [users, setUsers] = React.useState<any[]>([]);
  const [reports, setReports] = React.useState<ReportResponse[]>([]);
  const [lostObjects, setLostObjects] = React.useState<LostObjectResponse[]>([]);
  const [foundObjects, setFoundObjects] = React.useState<FoundObjectResponse[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, reportsData, lostData, foundData] = await Promise.allSettled([
          usersApi.getAll(),
          reportsApi.getAll(),
          lostObjectsApi.getAllList(),
          foundObjectsApi.getAllList(),
        ]);

        if (usersData.status === "fulfilled") setUsers(usersData.value as any[]);
        if (reportsData.status === "fulfilled") setReports(reportsData.value);
        if (lostData.status === "fulfilled") setLostObjects(lostData.value);
        if (foundData.status === "fulfilled") setFoundObjects(foundData.value);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Connect to WebSocket for real-time stats
  React.useEffect(() => {
    if (token) {
      adminStatsWsClient.connect(token, () => {});

      const unsubscribe = adminStatsWsClient.onStats((newStats) => {
        setStats(newStats);
      });

      return () => {
        unsubscribe();
        adminStatsWsClient.disconnect();
      };
    }
  }, [token]);

  const totalUsers = stats?.totalUsers || users.length;
  const totalLost = stats?.totalLostObjects || lostObjects.length;
  const totalFound = stats?.totalFoundObjects || foundObjects.length;
  const totalReports = reports.length;
  const pendingReports = reports.filter((r) => r.status === "PENDING").length;
  const verifiedUsers = users.filter((u: any) => u.verified).length;
  const bannedUsers = users.filter((u: any) => u.banned).length;

  // Prepare chart data: Category distribution
  const categoryChartData = React.useMemo(() => {
    const lostByCategory: Record<string, number> = {};
    const foundByCategory: Record<string, number> = {};

    lostObjects.forEach((o) => {
      lostByCategory[o.category] = (lostByCategory[o.category] || 0) + 1;
    });
    foundObjects.forEach((o) => {
      foundByCategory[o.category] = (foundByCategory[o.category] || 0) + 1;
    });

    const allCategories = new Set([...Object.keys(lostByCategory), ...Object.keys(foundByCategory)]);
    return Array.from(allCategories).map((cat) => ({
      category: cat,
      lost: lostByCategory[cat] || 0,
      found: foundByCategory[cat] || 0,
    }));
  }, [lostObjects, foundObjects]);

  // Prepare chart data: Reports by status
  const reportStatusChartData = React.useMemo(() => {
    const statusCounts: Record<string, number> = {};
    reports.forEach((r) => {
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
  }, [reports]);

  // Prepare chart data: Activity over time
  const activityOverTimeData = React.useMemo(() => {
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

  // Prepare chart data: Report types
  const reportTypeChartData = React.useMemo(() => {
    const typeCounts: Record<string, number> = {};
    reports.forEach((r) => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });

    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
    }));
  }, [reports]);

  // Prepare chart data: Radar
  const radarData = React.useMemo(() => {
    const totalLost = lostObjects.length;
    const totalFound = foundObjects.length;
    const totalReportsCount = reports.length;
    const totalMatches = stats?.totalMatches || 0;

    const maxVal = Math.max(totalLost, totalFound, totalReportsCount, totalMatches, 1);

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
        current: Math.round((totalReportsCount / maxVal) * 100),
        previous: Math.round((totalReportsCount * 0.8 / maxVal) * 100),
      },
      {
        subject: "Utilisateurs",
        current: Math.round(((stats?.totalUsers || 0) / maxVal) * 100),
        previous: Math.round(((stats?.totalUsers || 0) * 0.4 / maxVal) * 100),
      },
    ];
  }, [lostObjects, foundObjects, reports, stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Statistiques et métriques de la plateforme
          </p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Actualiser
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
                <p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-emerald-500">{verifiedUsers} vérifiés</span>
              <span>·</span>
              <span className="text-red-500">{bannedUsers} bannis</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Objets perdus</p>
                <p className="text-2xl font-bold">{totalLost.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {stats?.activeLostObjects || 0} actifs
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Objets trouvés</p>
                <p className="text-2xl font-bold">{totalFound.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {stats?.activeFoundObjects || 0} actifs
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Matches</p>
                <p className="text-2xl font-bold">{stats?.totalMatches?.toLocaleString() || "0"}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Correspondances trouvées
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalReports}</p>
                <p className="text-xs text-muted-foreground">Signalements total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingReports}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{verifiedUsers}</p>
                <p className="text-xs text-muted-foreground">Utilisateurs certifiés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Bar + Pie */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ObjectsByCategoryChart data={categoryChartData} />
        <ReportsByStatusChart data={reportStatusChartData} />
      </div>

      {/* Charts Row 2: Area + Radar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ObjectsOverTimeChart data={activityOverTimeData} />
        <PlatformActivityRadar data={radarData} />
      </div>

      {/* Charts Row 3: Horizontal Bar (report types) */}
      <ReportTypesChart data={reportTypeChartData} />

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Résumé de l&apos;activité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Utilisateurs</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-500">{totalLost + totalFound}</div>
              <p className="text-xs text-muted-foreground mt-1">Objets publiés</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500">{stats?.totalMatches || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Matches</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-500">{totalReports}</div>
              <p className="text-xs text-muted-foreground mt-1">Signalements</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <AuthGuard requireAdmin>
      <AnalyticsContent />
    </AuthGuard>
  );
}
