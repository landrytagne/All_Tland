"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { returnsApi, type ReturnRequestResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AuthGuard } from "@/components/auth-guard";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  Loader2,
  Package,
  PackageCheck,
  Shield,
  MapPin,
  Calendar,
  Star,
  MessageCircle,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  CHAT_INITIATED: { label: "Chat démarré", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: MessageCircle },
  REWARD_PROPOSED: { label: "Récompense proposée", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: DollarSign },
  REWARD_ACCEPTED: { label: "Récompense acceptée", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: DollarSign },
  BOTH_VALIDATED: { label: "Collaboration validée", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
  APPOINTMENT_SET: { label: "Rendez-vous fixé", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: Calendar },
  RETURN_IN_PROGRESS: { label: "En route", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: MapPin },
  RETURN_CONFIRMED: { label: "Retour confirmé", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
  PAYMENT_COMPLETED: { label: "Terminé", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
  DISPUTED: { label: "Litige", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertTriangle },
  DISPUTE_RESOLVED: { label: "Litige résolu", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", icon: Shield },
};

const stepOrder = ["CHAT_INITIATED", "REWARD_PROPOSED", "REWARD_ACCEPTED", "BOTH_VALIDATED", "APPOINTMENT_SET", "RETURN_IN_PROGRESS", "RETURN_CONFIRMED", "PAYMENT_COMPLETED"];

function ReturnsContent() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [returns, setReturns] = React.useState<ReturnRequestResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("active");

  React.useEffect(() => {
    const fetchReturns = async () => {
      try {
        const data = await returnsApi.getMy();
        setReturns(data);
      } catch (err) {
        console.error("Failed to fetch returns:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReturns();
  }, []);

  const formatCurrency = (n: number) => new Intl.NumberFormat("fr-CM").format(n) + " XAF";

  const activeReturns = returns.filter((r) =>
    !["PAYMENT_COMPLETED", "DISPUTE_RESOLVED", "REFUNDED"].includes(r.status)
  );

  const completedReturns = returns.filter((r) =>
    r.status === "PAYMENT_COMPLETED" || r.status === "DISPUTE_RESOLVED"
  );

  const disputedReturns = returns.filter((r) => r.status === "DISPUTED");

  const displayedReturns = activeTab === "active" ? activeReturns : activeTab === "completed" ? completedReturns : disputedReturns;

  const getStepProgress = (r: ReturnRequestResponse) => {
    const idx = stepOrder.indexOf(r.status);
    if (idx === -1) return 0;
    return Math.round(((idx + 1) / stepOrder.length) * 100);
  };

  const getOther = (r: ReturnRequestResponse) => {
    return user?.id === r.loser?.id ? r.finder : r.loser;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-6 px-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-primary" />
              {locale === "fr" ? "Mes restitutions" : "My Returns"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {returns.length} {locale === "fr" ? "échange(s) au total" : "exchange(s) total"}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : returns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-lg font-medium mb-1">
              {locale === "fr" ? "Aucune restitution" : "No returns yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {locale === "fr"
                ? "Initiez une restitution depuis une conversation pour commencer."
                : "Start a return from a conversation to begin."}
            </p>
            <Button asChild>
              <Link href="/messages">
                {locale === "fr" ? "Aller aux messages" : "Go to messages"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="active" className="flex-1">
              {locale === "fr" ? "En cours" : "Active"}
              {activeReturns.length > 0 && (
                <Badge className="ml-1.5 h-5 min-w-[20px] px-1 text-[10px]" variant="secondary">
                  {activeReturns.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">
              {locale === "fr" ? "Terminés" : "Completed"}
              {completedReturns.length > 0 && (
                <Badge className="ml-1.5 h-5 min-w-[20px] px-1 text-[10px]" variant="secondary">
                  {completedReturns.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="disputed" className="flex-1">
              {locale === "fr" ? "Litiges" : "Disputes"}
              {disputedReturns.length > 0 && (
                <Badge className="ml-1.5 h-5 min-w-[20px] px-1 text-[10px]" variant="destructive">
                  {disputedReturns.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="space-y-3">
            {displayedReturns.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {activeTab === "active"
                      ? locale === "fr" ? "Aucune restitution en cours" : "No active returns"
                      : activeTab === "completed"
                        ? locale === "fr" ? "Aucun échange terminé" : "No completed exchanges"
                        : locale === "fr" ? "Aucun litige" : "No disputes"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              displayedReturns.map((r) => {
                const other = getOther(r);
                const status = statusConfig[r.status] || { label: r.status, color: "bg-gray-100 text-gray-700", icon: Package };
                const StatusIcon = status.icon;
                const progress = getStepProgress(r);

                return (
                  <Link key={r.id} href={`/return/${r.id}`}>
                    <Card className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all">
                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{r.reference}</span>
                          </div>
                          <Badge className={`${status.color} text-[10px] font-medium border-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>

                        {/* Object */}
                        <h3 className="font-semibold text-sm mb-1">
                          {r.lostObjectTitle || r.foundObjectTitle || "Objet"}
                        </h3>

                        {/* Other party */}
                        <div className="flex items-center gap-2 mb-3">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[8px]">
                              {other?.name?.split(" ").map((n: string) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{other?.name}</span>
                          <span className="text-[10px] text-muted-foreground/60">•</span>
                          <span className="text-[10px] text-muted-foreground">
                            {user?.id === r.loser?.id ? "Retrouveur" : "Propriétaire"}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-muted-foreground">{progress}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {r.acceptedAmount && (
                              <span className="text-xs font-medium text-primary">
                                {formatCurrency(r.acceptedAmount)}
                              </span>
                            )}
                            {r.meetingDate && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(r.meetingDate).toLocaleDateString("fr")}
                              </span>
                            )}
                          </div>
                          {r.hasRating && (
                            <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber-500" />
                              Noté
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </Tabs>
      )}
    </div>
  );
}

export default function ReturnsPage() {
  return (
    <AuthGuard>
      <ReturnsContent />
    </AuthGuard>
  );
}
