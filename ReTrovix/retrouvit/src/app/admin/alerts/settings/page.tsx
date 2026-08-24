"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  Save,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthGuard } from "@/components/auth-guard";
import {
  adminThresholdsApi,
  type AlertThresholdResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { showToast } from "@/lib/toast";

// ─── Category Labels ────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  string,
  { label: string; description: string; icon: any; color: string }
> = {
  PENDING_REPORTS: {
    label: "Signalements en attente",
    description: "Déclenche une alerte quand le nombre de signalements non traités dépasse le seuil",
    icon: AlertTriangle,
    color: "text-amber-500",
  },
  ESCALATED_REPORTS: {
    label: "Signalements escaladés",
    description: "Alerte quand les signalements escaladés atteignent le seuil critique",
    icon: AlertCircle,
    color: "text-red-500",
  },
  BANNED_USERS: {
    label: "Utilisateurs bannis",
    description: "Alerte quand le nombre d'utilisateurs bannis est trop élevé",
    icon: AlertTriangle,
    color: "text-red-500",
  },
  LOW_ACTIVE_OBJECTS: {
    label: "Objets actifs insuffisants",
    description: "Alerte quand le nombre total d'objets actifs est trop faible",
    icon: Info,
    color: "text-blue-500",
  },
  LOW_MATCH_RATE: {
    label: "Taux de match faible",
    description: "Alerte quand le moteur de matching trouve trop peu de correspondances",
    icon: AlertTriangle,
    color: "text-amber-500",
  },
  NO_NEW_USERS: {
    label: "Aucun nouvel utilisateur",
    description: "Alerte quand il n'y a pas de nouvelles inscriptions aujourd'hui",
    icon: Info,
    color: "text-blue-500",
  },
};

const LEVEL_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  WARNING: {
    label: "⚠️ Attention",
    color: "text-amber-600",
    badge: "bg-amber-500/20 text-amber-700 border-amber-500/30",
  },
  CRITICAL: {
    label: "🔴 Critique",
    color: "text-red-600",
    badge: "bg-red-500/20 text-red-700 border-red-500/30",
  },
  INFO: {
    label: "ℹ️ Info",
    color: "text-blue-600",
    badge: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  },
};

// ─── Main Page ──────────────────────────────────────────────────────

export default function AdminThresholdsPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminThresholdsContent />
    </AuthGuard>
  );
}

function AdminThresholdsContent() {
  const [thresholds, setThresholds] = useState<AlertThresholdResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [editValues, setEditValues] = useState<Record<number, { value: string; enabled: boolean }>>({});
  const [saveSuccess, setSaveSuccess] = useState<number | null>(null);

  const fetchThresholds = async () => {
    setIsLoading(true);
    try {
      const data = await adminThresholdsApi.getAll();
      setThresholds(data);
      // Initialize edit values
      const edits: Record<number, { value: string; enabled: boolean }> = {};
      data.forEach((t) => {
        edits[t.id] = { value: String(t.value), enabled: t.enabled };
      });
      setEditValues(edits);
    } catch (err) {
      console.warn("Failed to fetch thresholds:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchThresholds();
  }, []);

  const handleSave = async (threshold: AlertThresholdResponse) => {
    const edit = editValues[threshold.id];
    if (!edit) return;

    const newValue = parseInt(edit.value, 10);
    if (isNaN(newValue) || newValue < 0) return;

    setIsSaving(threshold.id);
    try {
      const updated = await adminThresholdsApi.update(threshold.id, {
        value: newValue,
        enabled: edit.enabled,
      });
      setThresholds((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
      setSaveSuccess(threshold.id);
      setTimeout(() => setSaveSuccess(null), 2000);
      showToast({
        title: "Seuil sauvegardé",
        description: `Nouveau seuil : ${newValue}`,
        type: "SUCCESS",
      });
    } catch (err) {
      showToast({ title: "Erreur", description: "Impossible de sauvegarder le seuil", type: "ADMIN_ALERT" });
    } finally {
      setIsSaving(null);
    }
  };

  const handleResetDefaults = async () => {
    setIsResetting(true);
    try {
      await adminThresholdsApi.resetDefaults();
      await fetchThresholds();
      showToast({
        title: "Seuils réinitialisés",
        description: "Tous les seuils ont été remis aux valeurs par défaut",
        type: "NOTIFICATION",
      });
    } catch (err) {
      showToast({ title: "Erreur", description: "Impossible de réinitialiser les seuils", type: "ADMIN_ALERT" });
    } finally {
      setIsResetting(false);
    }
  };

  // Group thresholds by category
  const grouped = thresholds.reduce(
    (acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t);
      return acc;
    },
    {} as Record<string, AlertThresholdResponse[]>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/alerts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Configuration des seuils
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Modifier les seuils déclencheurs des alertes automatiques
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleResetDefaults}
          disabled={isResetting}
        >
          {isResetting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RotateCcw className="h-4 w-4 mr-1" />
          )}
          Réinitialiser
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-700">Comment ça marche</p>
              <p className="text-blue-600/80 mt-1">
                Les seuils déterminent quand une alerte est déclenchée. Par exemple, si le seuil
                <strong> "Signalements en attente - Attention"</strong> est à <strong>5</strong>,
                une alerte jaune apparaîtra quand il y aura 5 signalements en attente, et une alerte
                rouge (critique) quand le seuil critique sera atteint.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thresholds by Category */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => {
            const config = CATEGORY_CONFIG[category] || {
              label: category,
              description: "",
              icon: AlertTriangle,
              color: "text-gray-500",
            };
            const Icon = config.icon;

            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", config.color)} />
                    {config.label}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {items.map((threshold) => {
                      const levelConfig = LEVEL_CONFIG[threshold.level] || LEVEL_CONFIG.INFO;
                      const edit = editValues[threshold.id];
                      const hasChanges =
                        edit &&
                        (edit.value !== String(threshold.value) ||
                          edit.enabled !== threshold.enabled);

                      return (
                        <div
                          key={threshold.id}
                          className={cn(
                            "flex items-center gap-4 p-3 rounded-lg border transition-all",
                            edit?.enabled === false
                              ? "bg-muted/30 border-border/50 opacity-60"
                              : "bg-background"
                          )}
                        >
                          {/* Level Badge */}
                          <Badge
                            variant="outline"
                            className={cn("text-xs shrink-0 w-24 justify-center", levelConfig.badge)}
                          >
                            {levelConfig.label}
                          </Badge>

                          {/* Value Input */}
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              Seuil :
                            </span>
                            <Input
                              type="number"
                              min={0}
                              className="w-24 h-8 text-sm"
                              value={edit?.value ?? threshold.value}
                              onChange={(e) =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  [threshold.id]: {
                                    ...prev[threshold.id],
                                    value: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>

                          {/* Enable/Disable Toggle */}
                          <div className="flex items-center gap-2">
                            <button
                              className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                                edit?.enabled !== false ? "bg-emerald-500" : "bg-gray-300"
                              )}
                              onClick={() =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  [threshold.id]: {
                                    ...prev[threshold.id],
                                    enabled: !(prev[threshold.id]?.enabled ?? threshold.enabled),
                                  },
                                }))
                              }
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform",
                                  (edit?.enabled ?? threshold.enabled)
                                    ? "translate-x-4"
                                    : "translate-x-0"
                                )}
                              />
                            </button>
                            <span className="text-xs text-muted-foreground w-16">
                              {(edit?.enabled ?? threshold.enabled) ? "Activé" : "Désactivé"}
                            </span>
                          </div>

                          {/* Save Button */}
                          <Button
                            size="sm"
                            variant={saveSuccess === threshold.id ? "default" : "outline"}
                            className={cn(
                              "h-8 w-24 shrink-0",
                              saveSuccess === threshold.id && "bg-emerald-500 hover:bg-emerald-600"
                            )}
                            disabled={isSaving === threshold.id || !hasChanges}
                            onClick={() => handleSave(threshold)}
                          >
                            {isSaving === threshold.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : saveSuccess === threshold.id ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Sauvé
                              </>
                            ) : (
                              <>
                                <Save className="h-3 w-3 mr-1" />
                                Sauver
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Back to alerts */}
      <div className="flex justify-center">
        <Link href="/admin/alerts">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux alertes
          </Button>
        </Link>
      </div>
    </div>
  );
}
