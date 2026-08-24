"use client";

import * as React from "react";
import Link from "next/link";
import {
  Settings,
  Shield,
  ShieldCheck,
  Trophy,
  Package,
  Search,
  TrendingUp,
  MapPin,
  Calendar,
  BadgeCheck,
  Edit,
  Loader2,
  Star,
  Zap,
  ArrowRight,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ObjectCard } from "@/components/object-card";
import { AvatarUpload } from "@/components/avatar-upload";
import { ProfileHeaderSkeleton, StatsGridSkeleton, Skeleton } from "@/components/skeletons";
import {
  apiRequest,
  lostObjectsApi,
  foundObjectsApi,
  usersApi,
  type LostObjectResponse,
  type FoundObjectResponse,
} from "@/lib/api";
import { formatDate, getAvatarUrl } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const { user, isLoading, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [myLost, setMyLost] = React.useState<LostObjectResponse[]>([]);
  const [myFound, setMyFound] = React.useState<FoundObjectResponse[]>([]);
  const [isLoadingObjects, setIsLoadingObjects] = React.useState(true);
  const [uploadStatus, setUploadStatus] = React.useState<"idle" | "success" | "error">("idle");

  React.useEffect(() => {
    const fetchObjects = async () => {
      if (!user?.id) return;
      try {
        const [lost, found] = await Promise.allSettled([
          lostObjectsApi.getByUserId(user.id),
          foundObjectsApi.getByUserId(user.id),
        ]);
        if (lost.status === "fulfilled") setMyLost(lost.value.content || []);
        if (found.status === "fulfilled") setMyFound(found.value.content || []);
      } catch (err) {
        console.warn("Could not fetch user objects:", err);
      } finally {
        setIsLoadingObjects(false);
      }
    };
    fetchObjects();
  }, [user?.id]);

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const uploadRes = await apiRequest<{ url: string; filename: string }>("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      const imageUrl = uploadRes.url;
      await usersApi.update(user.id, { avatar: imageUrl });
      await refreshUser();
      setUploadStatus("success");
      setTimeout(() => setUploadStatus("idle"), 2000);
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      setUploadStatus("error");
      throw err;
    }
  };

  const displayName = user?.name || "Utilisateur";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase();
  const trustScore = user?.trustScore || 50;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-6 animate-fade-in">
          <ProfileHeaderSkeleton />
          <StatsGridSkeleton count={4} />
          <Card><CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-2 w-full" /></CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* ═══ Profile Header with Gradient ═══ */}
        <Card className="mb-6 overflow-hidden border-0 shadow-lg animate-fade-in">
          {/* Gradient banner */}
          <div className="relative h-32 bg-gradient-to-r from-forest via-forest/90 to-forest/70 dark:from-forest-light/30 dark:via-[#1a1a2e] dark:to-forest-light/10">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-4 right-10 h-24 w-24 rounded-full bg-orange-brand blur-[60px]" />
              <div className="absolute bottom-4 left-20 h-16 w-16 rounded-full bg-forest-light blur-[40px]" />
            </div>
          </div>

          <CardContent className="p-6 -mt-16 relative">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Avatar */}
              <div className="relative z-10">
                <AvatarUpload
                  currentAvatar={getAvatarUrl(user?.avatar)}
                  name={displayName}
                  onUpload={handleAvatarUpload}
                  size="xl"
                />
              </div>

              {/* Info */}
              <div className="flex-1 mt-2 sm:mt-4 animate-slide-in-left" style={{ animationDelay: "100ms" }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl font-bold">{displayName}</h1>
                  {uploadStatus === "success" && (
                    <span className="text-xs text-forest dark:text-forest-light animate-fade-in">✓ {t("profile.uploadSuccess")}</span>
                  )}
                  {user?.verified && (
                    <Badge variant="outline" className="gap-1 text-xs border-forest text-forest dark:text-forest-light dark:border-forest-light">
                      <BadgeCheck className="h-3 w-3" />
                      Vérifié
                    </Badge>
                  )}
                  {user?.role === "ADMIN" && (
                    <Badge className="text-[10px] bg-orange-brand text-white border-0">Admin</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">{user?.email}</p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                  {user?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-forest dark:text-forest-light" /> {user.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-orange-brand" />
                    Membre depuis {user?.createdAt ? formatDate(user.createdAt) : "récemment"}
                  </span>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <Link href="/settings">
                    <Button variant="outline" size="sm" className="gap-1.5 hover-lift rounded-xl">
                      <Edit className="h-3.5 w-3.5" />
                      Modifier le profil
                    </Button>
                  </Link>
                  <Link href="/publish">
                    <Button size="sm" className="gap-1.5 bg-forest hover:bg-forest/90 dark:bg-forest-light dark:hover:bg-forest-light/90 shadow-lg shadow-forest/20 dark:shadow-forest-light/20 rounded-xl">
                      <Package className="h-3.5 w-3.5" />
                      Publier un objet
                    </Button>
                  </Link>
                  {!user?.verified && (
                    <Link href="/certification">
                      <Button variant="outline" size="sm" className="gap-1.5 hover-lift rounded-xl border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Demander la certification
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══ Stats Grid ═══ */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-6 stagger-children">
          {[
            { label: "Objets perdus", value: user?.objectsLost || 0, icon: Package, color: "text-orange-brand", bg: "bg-orange-brand/10" },
            { label: "Objets trouvés", value: user?.objectsFound || 0, icon: Search, color: "text-forest dark:text-forest-light", bg: "bg-forest/10 dark:bg-forest-light/10" },
            { label: "Matches", value: user?.matches || 0, icon: TrendingUp, color: "text-forest dark:text-forest-light", bg: "bg-forest/10 dark:bg-forest-light/10" },
            { label: "Score confiance", value: `${trustScore}%`, icon: Trophy, color: "text-orange-brand", bg: "bg-orange-brand/10" },
          ].map((stat) => (
            <Card key={stat.label} className="hover-lift border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-2", stat.bg)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ═══ Trust Score ═══ */}
        <Card className="mb-6 border-0 shadow-sm animate-fade-in" style={{ animationDelay: "200ms" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-forest dark:text-forest-light" />
              Score de confiance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-forest dark:text-forest-light">{trustScore}%</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-3",
                  trustScore >= 80
                    ? "border-forest text-forest dark:border-forest-light dark:text-forest-light bg-forest/5 dark:bg-forest-light/5"
                    : trustScore >= 50
                      ? "border-orange-brand text-orange-brand bg-orange-brand/5"
                      : "border-red-500 text-red-500 bg-red-500/5"
                )}
              >
                {trustScore >= 80 ? "⭐ Excellent" : trustScore >= 50 ? "📈 En progression" : "⚠️ À améliorer"}
              </Badge>
            </div>

            <Progress
              value={trustScore}
              className="h-3 mb-6 [&>div]:bg-gradient-to-r [&>div]:from-forest [&>div]:to-forest-light dark:[&>div]:from-forest-light dark:[&>div]:to-forest"
            />

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Vérification", value: user?.verified ? "Identité vérifiée" : "Non vérifié", icon: BadgeCheck, active: user?.verified },
                { label: "Activité", value: `${(user?.objectsLost || 0) + (user?.objectsFound || 0)} publications`, icon: Zap, active: (user?.objectsLost || 0) + (user?.objectsFound || 0) > 0 },
                { label: "Retours", value: `${user?.objectsFound || 0} objets`, icon: Star, active: (user?.objectsFound || 0) > 0 },
              ].map((item) => (
                <div key={item.label} className="text-center p-3 rounded-xl bg-muted/30">
                  <item.icon className={cn("h-5 w-5 mx-auto mb-1.5", item.active ? "text-forest dark:text-forest-light" : "text-muted-foreground/50")} />
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ═══ Publications ═══ */}
        <div className="animate-fade-in" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Mes publications</h2>
            <Link href="/publish" className="text-sm text-orange-brand hover:underline flex items-center gap-1 font-medium">
              Publier <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <Tabs defaultValue="lost">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="lost" className="data-[state=active]:bg-forest data-[state=active]:text-white dark:data-[state=active]:bg-forest-light rounded-lg gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Perdus ({myLost.length})
              </TabsTrigger>
              <TabsTrigger value="found" className="data-[state=active]:bg-orange-brand data-[state=active]:text-white rounded-lg gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Trouvés ({myFound.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lost" className="mt-4">
              {isLoadingObjects ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-forest dark:text-forest-light" />
                </div>
              ) : myLost.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 stagger-children">
                  {myLost.map((obj) => (
                    <ObjectCard
                      key={obj.id}
                      id={String(obj.id)}
                      title={obj.title}
                      description={obj.description}
                      category={obj.category}
                      location={obj.location}
                      date={obj.dateLost}
                      user={{ name: obj.user.name, trustScore: obj.user.trustScore || 50, verified: obj.user.verified || false }}
                      status={obj.status.toLowerCase() as "active" | "matched" | "resolved" | "expired"}
                      reward={obj.reward}
                      views={obj.views}
                      type="lost"
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-10 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-orange-brand/10 flex items-center justify-center mx-auto mb-3">
                      <Package className="h-8 w-8 text-orange-brand/40" />
                    </div>
                    <h3 className="font-semibold mb-1">Aucune annonce perdue</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Vous n&apos;avez pas encore déclaré d&apos;objet perdu.
                    </p>
                    <Link href="/publish">
                      <Button size="sm" className="bg-forest dark:bg-forest-light rounded-xl">
                        <Package className="h-4 w-4 mr-1.5" />
                        Déclarer un objet perdu
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="found" className="mt-4">
              {isLoadingObjects ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-brand" />
                </div>
              ) : myFound.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 stagger-children">
                  {myFound.map((obj) => (
                    <ObjectCard
                      key={obj.id}
                      id={String(obj.id)}
                      title={obj.title}
                      description={obj.description}
                      category={obj.category}
                      location={obj.location}
                      date={obj.dateFound}
                      user={{ name: obj.user.name, trustScore: obj.user.trustScore || 50, verified: obj.user.verified || false }}
                      status={obj.status.toLowerCase() as "active" | "matched" | "returned" | "expired"}
                      views={obj.views}
                      type="found"
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-10 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-forest/10 dark:bg-forest-light/10 flex items-center justify-center mx-auto mb-3">
                      <Search className="h-8 w-8 text-forest/30 dark:text-forest-light/30" />
                    </div>
                    <h3 className="font-semibold mb-1">Aucune annonce trouvée</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Vous n&apos;avez pas encore trouvé d&apos;objet.
                    </p>
                    <Link href="/feed/found">
                      <Button size="sm" variant="outline" className="rounded-xl border-forest text-forest dark:border-forest-light dark:text-forest-light">
                        <Search className="h-4 w-4 mr-1.5" />
                        Parcourir les objets trouvés
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
