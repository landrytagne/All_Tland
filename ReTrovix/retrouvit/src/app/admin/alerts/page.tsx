"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  History,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth-guard";
import { adminAlertsApi, type AdminAlertResponse } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

// ─── Level Config ───────────────────────────────────────────────────

const LEVEL_CONFIG = {
  CRITICAL: {
    icon: AlertCircle,
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-600 dark:text-red-400",
    badge: "bg-red-500/20 text-red-700 dark:text-red-300",
    label: "Critique",
  },
  WARNING: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    label: "Attention",
  },
  INFO: {
    icon: Info,
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
    label: "Info",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  PENDING_REPORTS: "Signalements en attente",
  ESCALATED_REPORTS: "Signalements escaladés",
  BANNED_USERS: "Utilisateurs bannis",
  LOW_ACTIVE_OBJECTS: "Objets actifs insuffisants",
  LOW_MATCH_RATE: "Taux de match faible",
  NO_NEW_USERS: "Aucun nouvel utilisateur",
};

// ─── Main Page ──────────────────────────────────────────────────────

export default function AdminAlertsPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminAlertsContent />
    </AuthGuard>
  );
}

function AdminAlertsContent() {
  const [alerts, setAlerts] = useState<AdminAlertResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "acknowledged">("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await adminAlertsApi.getAll();
      setAlerts(data);
    } catch (err) {
      console.warn("Failed to fetch alerts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = async (id: number) => {
    try {
      await adminAlertsApi.acknowledge(id);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, acknowledged: true, acknowledgedAt: new Date().toISOString() }
            : a
        )
      );
      showToast({
        title: "Alerte acquittée",
        description: "L'alerte a été marquée comme traitée",
        type: "SUCCESS",
      });
    } catch (err) {
      showToast({ title: "Erreur", description: "Impossible d'acquitter l'alerte", type: "ADMIN_ALERT" });
    }
  };

  // ─── Filtered Data ──────────────────────────────────────────────

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (filter === "active" && a.acknowledged) return false;
      if (filter === "acknowledged" && !a.acknowledged) return false;
      if (levelFilter !== "all" && a.level !== levelFilter) return false;
      return true;
    });
  }, [alerts, filter, levelFilter]);

  // ─── Stats ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = alerts.length;
    const active = alerts.filter((a) => !a.acknowledged).length;
    const acknowledged = alerts.filter((a) => a.acknowledged).length;
    const critical = alerts.filter((a) => a.level === "CRITICAL" && !a.acknowledged).length;
    const warning = alerts.filter((a) => a.level === "WARNING" && !a.acknowledged).length;
    return { total, active, acknowledged, critical, warning };
  }, [alerts]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Historique des alertes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.active} active{stats.active > 1 ? "s" : ""} · {stats.acknowledged} acquittée{stats.acknowledged > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/alerts/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              Seuils
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                <History className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.active}</div>
                <div className="text-xs text-muted-foreground">Actives</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.critical}</div>
                <div className="text-xs text-muted-foreground">Critiques</div>
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
                <div className="text-2xl font-bold">{stats.acknowledged}</div>
                <div className="text-xs text-muted-foreground">Acquittées</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Statut :</span>
        </div>
        {(["all", "active", "acknowledged"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Toutes" : f === "active" ? "Actives" : "Acquittées"}
            {f === "active" && ` (${stats.active})`}
            {f === "acknowledged" && ` (${stats.acknowledged})`}
          </Button>
        ))}

        <div className="w-px h-6 bg-border mx-1" />

        <span className="text-sm text-muted-foreground">Niveau :</span>
        {(["all", "CRITICAL", "WARNING", "INFO"] as const).map((l) => (
          <Button
            key={l}
            variant={levelFilter === l ? "default" : "outline"}
            size="sm"
            onClick={() => setLevelFilter(l)}
          >
            {l === "all" ? "Tous" : LEVEL_CONFIG[l]?.label || l}
          </Button>
        ))}
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {filteredAlerts.length} alerte{filteredAlerts.length > 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-emerald-500/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Aucune alerte à afficher</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const config = LEVEL_CONFIG[alert.level] || LEVEL_CONFIG.INFO;
                const Icon = config.icon;

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border transition-all",
                      alert.acknowledged
                        ? "bg-muted/30 border-border/50 opacity-60"
                        : config.bg,
                      !alert.acknowledged && config.border
                    )}
                  >
                    {/* Icon */}
                    <div className={cn("mt-0.5 shrink-0", alert.acknowledged ? "text-muted-foreground" : config.text)}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={cn("text-sm font-semibold", alert.acknowledged ? "text-muted-foreground" : config.text)}>
                          {alert.title}
                        </span>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", alert.acknowledged ? "bg-muted text-muted-foreground" : config.badge)}>
                          {config.label}
                        </Badge>
                        {alert.acknowledged && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            ✓ Acquittée
                          </Badge>
                        )}
                      </div>
                      <p className={cn("text-sm", alert.acknowledged ? "text-muted-foreground" : "text-foreground")}>
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          Catégorie: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">{CATEGORY_LABELS[alert.category] || alert.category}</code>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Valeur: <strong>{alert.currentValue}</strong> / Seuil: {alert.thresholdValue}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Créée: {new Date(alert.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {alert.acknowledgedAt && (
                          <span className="text-xs text-emerald-600">
                            Acquittée: {new Date(alert.acknowledgedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    {!alert.acknowledged && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Acquitter
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
