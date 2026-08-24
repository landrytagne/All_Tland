"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, AlertCircle, Info, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { adminAlertsApi, type AdminAlertResponse } from "@/lib/api-admin";
import {
  adminAlertsWsClient,
  type AdminAlert,
} from "@/lib/admin-alerts-ws";
import { useAuth } from "@/contexts/AuthContext";

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

// ─── Single Alert Item ──────────────────────────────────────────────

function AlertItem({
  alert,
  onAcknowledge,
}: {
  alert: AdminAlertResponse;
  onAcknowledge: (id: number) => void;
}) {
  const config = LEVEL_CONFIG[alert.level] || LEVEL_CONFIG.INFO;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all",
        config.bg,
        config.border
      )}
    >
      <div className={cn("mt-0.5 shrink-0", config.text)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn("text-sm font-semibold", config.text)}>
            {alert.title}
          </span>
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0", config.badge)}
          >
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{alert.message}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            Seuil: {alert.thresholdValue} · Actuel: {alert.currentValue}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(alert.createdAt).toLocaleTimeString("fr-FR")}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 shrink-0"
        onClick={() => onAcknowledge(alert.id)}
        title="Acquitter"
      >
        <Check className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ─── Main Banner Component ──────────────────────────────────────────

export function AdminAlertBanner() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<AdminAlertResponse[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch initial alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await adminAlertsApi.getActive();
        setAlerts(data);
      } catch (err) {
        console.warn("Could not fetch alerts:", err);
      }
    };
    fetchAlerts();
  }, []);

  // Connect WebSocket for real-time alerts
  useEffect(() => {
    if (!token) return;

    adminAlertsWsClient.connect(token, () => {
      setIsConnected(true);
    });

    return () => {
      adminAlertsWsClient.disconnect();
      setIsConnected(false);
    };
  }, [token]);

  // Subscribe to real-time alerts
  useEffect(() => {
    const unsubscribe = adminAlertsWsClient.onAlerts((newAlerts) => {
      setAlerts((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const toAdd = newAlerts.filter((a) => !existingIds.has(a.id));
        return [...toAdd, ...prev];
      });
    });

    return unsubscribe;
  }, []);

  // Acknowledge an alert
  const handleAcknowledge = useCallback(async (id: number) => {
    try {
      await adminAlertsApi.acknowledge(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.warn("Failed to acknowledge alert:", err);
    }
  }, []);

  // Acknowledge all
  const handleAcknowledgeAll = useCallback(async () => {
    try {
      await Promise.all(alerts.map((a) => adminAlertsApi.acknowledge(a.id)));
      setAlerts([]);
    } catch (err) {
      console.warn("Failed to acknowledge all alerts:", err);
    }
  }, [alerts]);

  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.level === "CRITICAL").length;
  const warningCount = alerts.filter((a) => a.level === "WARNING").length;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Alertes automatiques
            <Badge variant="secondary" className="text-xs">
              {alerts.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                )}
              />
              <span className="text-[10px] text-muted-foreground">
                {isConnected ? "Temps réel" : "Hors ligne"}
              </span>
            </div>
            {alerts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px]"
                onClick={handleAcknowledgeAll}
              >
                Tout acquitter
              </Button>
            )}
          </div>
        </div>
        {/* Summary badges */}
        <div className="flex gap-2 mt-1">
          {criticalCount > 0 && (
            <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/30">
              🔴 {criticalCount} critique{criticalCount > 1 ? "s" : ""}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
              🟡 {warningCount} attention{warningCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Show first 3 alerts */}
        {alerts.slice(0, isExpanded ? alerts.length : 3).map((alert) => (
          <AlertItem
            key={alert.id}
            alert={alert}
            onAcknowledge={handleAcknowledge}
          />
        ))}
        {alerts.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded
              ? "Voir moins"
              : `Voir ${alerts.length - 3} alerte${alerts.length - 3 > 1 ? "s" : ""} de plus`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
