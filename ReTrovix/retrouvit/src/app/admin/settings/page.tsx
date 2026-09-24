"use client";

import * as React from "react";
import {
  Settings,
  Save,
  Loader2,
  Bell,
  Shield,
  Globe,
  Mail,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthGuard } from "@/components/auth-guard";
import { platformSettingsApi, type PlatformSettingsResponse } from "@/lib/api-admin";

interface PlatformSettings {
  siteName: string;
  siteDescription: string;
  supportEmail: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  autoMatchEnabled: boolean;
  maxUploadSize: number;
  defaultLanguage: string;
  minTrustScoreForCertification: number;
  platformFeePercent: number;
}

const defaultSettings: PlatformSettings = {
  siteName: "RetrouvIt",
  siteDescription: "La plateforme camerounaise qui reconnecte les personnes avec leurs objets perdus.",
  supportEmail: "support@retrouvit.com",
  maintenanceMode: false,
  registrationEnabled: true,
  emailNotifications: true,
  smsNotifications: false,
  autoMatchEnabled: true,
  maxUploadSize: 5,
  defaultLanguage: "fr",
  minTrustScoreForCertification: 40,
  platformFeePercent: 5,
};

function SettingsContent() {
  const [settings, setSettings] = React.useState<PlatformSettings>(defaultSettings);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await platformSettingsApi.getAll();
        const settingsMap: Record<string, string> = {};
        data.forEach((s) => {
          settingsMap[s.settingKey] = s.settingValue;
        });

        setSettings({
          siteName: settingsMap.site_name || defaultSettings.siteName,
          siteDescription: settingsMap.site_description || defaultSettings.siteDescription,
          supportEmail: settingsMap.support_email || defaultSettings.supportEmail,
          maintenanceMode: settingsMap.maintenance_mode === "true",
          registrationEnabled: settingsMap.registration_enabled !== "false",
          emailNotifications: settingsMap.email_notifications !== "false",
          smsNotifications: settingsMap.sms_notifications === "true",
          autoMatchEnabled: settingsMap.auto_match_enabled !== "false",
          maxUploadSize: Number(settingsMap.max_upload_size_mb) || defaultSettings.maxUploadSize,
          defaultLanguage: settingsMap.default_language || defaultSettings.defaultLanguage,
          minTrustScoreForCertification: Number(settingsMap.min_trust_score_certification) || defaultSettings.minTrustScoreForCertification,
          platformFeePercent: Number(settingsMap.platform_fee_percent) || defaultSettings.platformFeePercent,
        });
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await platformSettingsApi.updateMultiple({
        site_name: settings.siteName,
        site_description: settings.siteDescription,
        support_email: settings.supportEmail,
        maintenance_mode: String(settings.maintenanceMode),
        registration_enabled: String(settings.registrationEnabled),
        email_notifications: String(settings.emailNotifications),
        sms_notifications: String(settings.smsNotifications),
        auto_match_enabled: String(settings.autoMatchEnabled),
        max_upload_size_mb: String(settings.maxUploadSize),
        default_language: settings.defaultLanguage,
        min_trust_score_certification: String(settings.minTrustScoreForCertification),
        platform_fee_percent: String(settings.platformFeePercent),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Paramètres
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configuration de la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Réinitialiser
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* Success message */}
      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-sm text-emerald-600">Paramètres enregistrés avec succès !</span>
        </div>
      )}

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Général
          </CardTitle>
          <CardDescription>
            Paramètres généraux de la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siteName">Nom du site</Label>
              <Input
                id="siteName"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Email support</Label>
              <Input
                id="supportEmail"
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteDescription">Description</Label>
            <Textarea
              id="siteDescription"
              value={settings.siteDescription}
              onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
              rows={2}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultLanguage">Langue par défaut</Label>
              <Select
                value={settings.defaultLanguage}
                onValueChange={(value) => setSettings({ ...settings, defaultLanguage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUploadSize">Taille max upload (MB)</Label>
              <Input
                id="maxUploadSize"
                type="number"
                value={settings.maxUploadSize}
                onChange={(e) => setSettings({ ...settings, maxUploadSize: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Plateforme
          </CardTitle>
          <CardDescription>
            Configuration de la certification et des transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minTrustScore">Score min. certification</Label>
              <Input
                id="minTrustScore"
                type="number"
                value={settings.minTrustScoreForCertification}
                onChange={(e) =>
                  setSettings({ ...settings, minTrustScoreForCertification: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platformFee">Frais plateforme (%)</Label>
              <Input
                id="platformFee"
                type="number"
                value={settings.platformFeePercent}
                onChange={(e) => setSettings({ ...settings, platformFeePercent: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Matching automatique</Label>
              <p className="text-sm text-muted-foreground">
                Activer le matching automatique des objets
              </p>
            </div>
            <Switch
              checked={settings.autoMatchEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, autoMatchEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Paramètres de notification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notifications email</Label>
              <p className="text-sm text-muted-foreground">
                Envoyer des notifications par email
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notifications SMS</Label>
              <p className="text-sm text-muted-foreground">
                Envoyer des notifications par SMS
              </p>
            </div>
            <Switch
              checked={settings.smsNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zone de danger
          </CardTitle>
          <CardDescription>
            Actions critiques qui affectent toute la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mode maintenance</Label>
              <p className="text-sm text-muted-foreground">
                Désactiver l&apos;accès à la plateforme pour les utilisateurs
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Inscriptions</Label>
              <p className="text-sm text-muted-foreground">
                Autoriser les nouvelles inscriptions
              </p>
            </div>
            <Switch
              checked={settings.registrationEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, registrationEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <AuthGuard requireAdmin>
      <SettingsContent />
    </AuthGuard>
  );
}
