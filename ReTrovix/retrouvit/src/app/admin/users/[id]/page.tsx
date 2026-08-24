"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  Eye,
  FileText,
  Globe,
  Mail,
  MapPin,
  Package,
  Shield,
  ShieldAlert,
  TrendingUp,
  Trash2,
  Wallet,
  AlertTriangle,
  Calendar,
  Activity,
  Target,
  RefreshCw,
  Download,
  LogOut,
  Smartphone,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { adminApi, type AdminUser, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";

// Mock data for sections the backend doesn't cover yet
const mockPosts = [
  { id: "P-1892", title: "iPhone 15 Pro Max perdu", type: "lost" as const, status: "active" as const, date: "2025-08-18", views: 234, matches: 2, reward: 15000 },
  { id: "P-1845", title: "Clés de voiture BMW", type: "lost" as const, status: "matched" as const, date: "2025-08-10", views: 189, matches: 4, reward: 10000 },
  { id: "P-1790", title: "Portefeuille cuir brun", type: "found" as const, status: "resolved" as const, date: "2025-07-28", views: 312, matches: 6 },
];

const mockTransactions = [
  { id: "T-8901", type: "escrow_in", amount: 15000, status: "completed", date: "2025-08-18", description: "Récompense iPhone 15 Pro Max" },
  { id: "T-8856", type: "withdrawal", amount: -25000, status: "completed", date: "2025-08-15", description: "Retrait Mobile Money" },
  { id: "T-8801", type: "escrow_out", amount: -10000, status: "pending", date: "2025-08-12", description: "Escrow clés BMW — En attente" },
];

const mockActivity = [
  { action: "Connexion", detail: "Yaoundé · Chrome / Android", time: "Il y a 12min", icon: Globe },
  { action: "Publication créée", detail: "iPhone 15 Pro Max perdu", time: "Il y a 2h", icon: FileText },
  { action: "Réponse à un match", detail: "Portefeuille cuir — Confirmer retour", time: "Il y a 5h", icon: CheckCircle2 },
  { action: "Retrait effectué", detail: "25 000 FCFA via Mobile Money", time: "Il y a 1 jour", icon: Wallet },
  { action: "Profil mis à jour", detail: "Photo de profil modifiée", time: "Il y a 2 jours", icon: Edit3 },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "active": return <Badge variant="default">Actif</Badge>;
    case "matched": return <Badge variant="warning">Match</Badge>;
    case "resolved": return <Badge variant="success">Résolu</Badge>;
    case "completed": return <Badge variant="success">Complété</Badge>;
    case "pending": return <Badge variant="warning">En attente</Badge>;
    case "dismissed": return <Badge variant="secondary">Rejeté</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const [activeTab, setActiveTab] = useState("overview");

  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchUser = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      const data = await adminApi.getUser(Number(userId));
      setUser(data);
      setLastRefresh(new Date());
      setError("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("Accès refusé. Vous devez être administrateur.");
      } else if (err instanceof ApiError && err.status === 404) {
        setError("Utilisateur non trouvé.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Impossible de contacter le serveur.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
    const interval = setInterval(() => fetchUser(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </Link>
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erreur</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = user.name.split(" ").map((n) => n[0]).join("");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <Badge variant="default" className="gap-1">
              <BadgeCheck className="h-3 w-3" />
              {user.role}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              ID: {user.id}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {user.email} · Membre depuis {user.createdAt ? formatDate(user.createdAt) : "N/A"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {lastRefresh.toLocaleTimeString("fr-FR")}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchUser(true)} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-1" />
            Contacter
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Ban className="h-4 w-4 mr-1" />
            Bannir
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Avatar className="h-20 w-20 mx-auto mb-4">
                <AvatarFallback className="text-xl font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <h2 className="font-semibold text-lg">{user.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
              {user.location && (
                <div className="flex items-center justify-center gap-1 mt-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {user.location}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4" />
                Données API
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-mono">{user.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nom</span>
                  <span className="font-medium">{user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-xs">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rôle</span>
                  <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="text-[10px]">
                    {user.role}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inscrit le</span>
                  <span className="text-xs">{user.createdAt ? formatDate(user.createdAt) : "N/A"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right content — Tabs */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
              <TabsTrigger value="posts">Publications</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="activity">Activité</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Informations du compte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">ID Utilisateur</p>
                      <p className="font-mono font-medium">{user.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Nom complet</p>
                      <p className="font-medium">{user.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Email</p>
                      <p className="font-medium">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Rôle</p>
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Date d&apos;inscription</p>
                      <p className="font-medium">{user.createdAt ? formatDate(user.createdAt) : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Statut</p>
                      <Badge variant="success">Actif</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live data notice */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-blue-700 dark:text-blue-400">
                  Données synchronisées en temps réel avec le backend.
                </span>
              </div>

              {/* Posts preview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Publications récentes</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("posts")}>
                      Tout voir
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockPosts.slice(0, 3).map((post) => (
                    <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                        post.type === "lost" ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"
                      }`}>
                        {post.type === "lost" ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{post.title}</p>
                          {getStatusBadge(post.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {post.id} · {post.views} vues
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Posts */}
            <TabsContent value="posts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Toutes les publications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockPosts.map((post) => (
                    <div key={post.id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={post.type === "lost" ? "destructive" : "success"} className="text-[10px]">
                              {post.type === "lost" ? "Perdu" : "Trouvé"}
                            </Badge>
                            {getStatusBadge(post.status)}
                            <span className="text-xs text-muted-foreground font-mono">{post.id}</span>
                          </div>
                          <h3 className="font-medium">{post.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {post.views} vues
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" /> {post.matches} matches
                            </span>
                            {post.reward && (
                              <span className="flex items-center gap-1 font-medium text-amber-600">
                                <Wallet className="h-3 w-3" /> {post.reward.toLocaleString()} FCFA
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions */}
            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Historique des transactions</CardTitle>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Exporter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                        tx.amount > 0 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"
                      }`}>
                        {tx.amount > 0 ? (
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{tx.description}</p>
                          {getStatusBadge(tx.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">{tx.id} · {formatDate(tx.date)}</p>
                      </div>
                      <span className={`font-semibold text-sm ${tx.amount > 0 ? "text-emerald-600" : "text-foreground"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} FCFA
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity */}
            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Journal d&apos;activité</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {mockActivity.map((log, i) => (
                      <div key={i} className="flex gap-4 relative">
                        <div className="flex flex-col items-center">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <log.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          {i < mockActivity.length - 1 && (
                            <div className="w-px flex-1 bg-border" />
                          )}
                        </div>
                        <div className="pb-6 pt-1 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{log.action}</p>
                            <span className="text-xs text-muted-foreground">{log.time}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{log.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
