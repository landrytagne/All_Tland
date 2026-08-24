"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  User,
  Lock,
  Bell,
  Shield,
  Smartphone,
  LogOut,
  Eye,
  EyeOff,
  Palette,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeSelect } from "@/components/theme-select";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { usersApi, ApiError } from "@/lib/api";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}

function SettingsContent() {
  const { user, logout, refreshUser } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const displayName = user?.name || "Utilisateur";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase();

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess("");
    setProfileError("");
    setIsSavingProfile(true);

    try {
      const userId = localStorage.getItem("retrouvit_user_id");
      if (!userId) throw new Error("ID utilisateur non trouvé");
      await usersApi.update(Number(userId), { name, email });
      await refreshUser();
      setProfileSuccess(t("settings.saved"));
    } catch (err) {
      if (err instanceof ApiError) {
        setProfileError(err.message);
      } else if (err instanceof Error) {
        setProfileError(err.message);
      } else {
        setProfileError(t("common.error"));
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const userId = localStorage.getItem("retrouvit_user_id");
      if (!userId) throw new Error("ID utilisateur non trouvé");
      await usersApi.update(Number(userId), { password: newPassword });
      setPasswordSuccess(t("settings.saved"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordError(err.message);
      } else {
        setPasswordError(t("common.error"));
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
      return;
    }

    try {
      const userId = localStorage.getItem("retrouvit_user_id");
      if (userId) {
        await usersApi.delete(Number(userId));
      }
      logout();
      router.push("/");
    } catch (err) {
      alert(t("common.error"));
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {t("settings.title")}
          </h1>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="w-full justify-start flex-wrap">
            <TabsTrigger value="profile" className="gap-1">
              <User className="h-3 w-3" /> {t("settings.personalInfo")}
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1">
              <Lock className="h-3 w-3" /> {t("nav.settings")}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1">
              <Bell className="h-3 w-3" /> {t("settings.notifications")}
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1">
              <Palette className="h-3 w-3" /> {t("settings.theme")}
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("settings.personalInfo")}</CardTitle>
              </CardHeader>
              <CardContent>
                {profileSuccess && (
                  <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-emerald-700 dark:text-emerald-400">{profileSuccess}</span>
                  </div>
                )}
                {profileError && (
                  <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <span className="text-destructive">{profileError}</span>
                  </div>
                )}
                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                    </Avatar>
                    <Button variant="outline" size="sm" type="button">
                      {t("profile.uploadAvatar")}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.name")}</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={isSavingProfile}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.email")}</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isSavingProfile}
                    />
                  </div>
                  <Button type="submit" disabled={isSavingProfile}>
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("common.save")}...
                      </>
                    ) : (
                      t("common.save")
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("settings.changePassword")}</CardTitle>
              </CardHeader>
              <CardContent>
                {passwordSuccess && (
                  <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-emerald-700 dark:text-emerald-400">{passwordSuccess}</span>
                  </div>
                )}
                {passwordError && (
                  <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <span className="text-destructive">{passwordError}</span>
                  </div>
                )}
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("settings.currentPassword")}</Label>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={isChangingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.newPassword")}</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isChangingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.confirmPassword")}</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isChangingPassword}
                    />
                  </div>
                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("common.save")}...
                      </>
                    ) : (
                      t("settings.saveChanges")
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  2FA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">2FA par SMS</p>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.emailNotificationsDesc")}
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Appareils connectés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Appareil actuel", location: "Yaoundé", lastActive: "Maintenant", current: true },
                  { name: "Chrome — MacBook", location: "Yaoundé", lastActive: "Il y a 2h", current: false },
                ].map((device) => (
                  <div key={device.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${device.current ? "bg-emerald-500" : "bg-muted"}`} />
                      <div>
                        <p className="text-sm font-medium">{device.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {device.location} · {device.lastActive}
                        </p>
                      </div>
                    </div>
                    {!device.current && (
                      <Button variant="ghost" size="sm" className="text-destructive">
                        {t("nav.logout")}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-sm text-destructive">{t("settings.dangerZone")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t("nav.logout")}</p>
                    <p className="text-xs text-muted-foreground">Se déconnecter de tous les appareils</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-1" />
                    {t("nav.logout")}
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t("settings.deleteAccount")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.deleteAccountDesc")}</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>
                    {t("common.delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("settings.notifications")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: t("settings.matchAlerts"), description: t("settings.matchAlertsDesc"), defaultChecked: true },
                  { label: t("settings.messageNotifications"), description: t("settings.messageNotificationsDesc"), defaultChecked: true },
                  { label: "Mises à jour de réclamation", description: "Notification lors du statut d'une réclamation", defaultChecked: true },
                  { label: t("settings.emailNotifications"), description: t("settings.emailNotificationsDesc"), defaultChecked: false },
                  { label: "Newsletter", description: "Recevoir les actualités de RetrouvIt", defaultChecked: false },
                ].map((pref) => (
                  <div key={pref.label} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{pref.label}</p>
                      <p className="text-xs text-muted-foreground">{pref.description}</p>
                    </div>
                    <Switch defaultChecked={pref.defaultChecked} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("settings.theme")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ThemeSelect />
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t("settings.language")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.languageDesc")}</p>
                  </div>
                  <LanguageSwitcher showLabel />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
