"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  ArrowRight,
  Eye,
  RefreshCw,
  Lock,
  Calendar,
  User,
  MapPin,
  Loader2,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { StatsCard } from "@/components/stats-card";
import { escrowApi, type EscrowResponse } from "@/lib/api";
import { formatDate } from "@/lib/utils";

function getStatusInfo(status: string) {
  switch (status) {
    case "AWAITING_RETURN":
      return { label: "En attente de retour", variant: "warning" as const, icon: Clock, color: "text-amber-500" };
    case "RETURN_CONFIRMED":
      return { label: "Retour confirmé", variant: "success" as const, icon: CheckCircle2, color: "text-blue-500" };
    case "COMPLETED":
      return { label: "Complété", variant: "success" as const, icon: CheckCircle2, color: "text-emerald-500" };
    case "REFUNDED":
      return { label: "Remboursé", variant: "secondary" as const, icon: RefreshCw, color: "text-muted-foreground" };
    case "DISPUTED":
      return { label: "En litige", variant: "destructive" as const, icon: AlertTriangle, color: "text-red-500" };
    default:
      return { label: status, variant: "secondary" as const, icon: Shield, color: "text-muted-foreground" };
  }
}

export default function EscrowPage() {
  return (
    <AuthGuard>
      <EscrowContent />
    </AuthGuard>
  );
}

function EscrowContent() {
  const [escrows, setEscrows] = useState<EscrowResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEscrows = async () => {
      try {
        const data = await escrowApi.getAll();
        setEscrows(data);
      } catch (err) {
        console.warn("Could not fetch escrows:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEscrows();
  }, []);

  const activeEscrows = escrows.filter(e => ["AWAITING_RETURN", "RETURN_CONFIRMED"].includes(e.status));
  const completedEscrows = escrows.filter(e => ["COMPLETED", "REFUNDED"].includes(e.status));

  const totalEscrowed = activeEscrows.reduce((sum, e) => sum + e.amount, 0);

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Escrow & Séquestre
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vos fonds sont protégés. RetrouvIt séquestre les récompenses jusqu&apos;au
            retour confirmé de l&apos;objet.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
              <StatsCard
                title="Escrows actifs"
                value={activeEscrows.length}
                icon={Shield}
                change="En cours"
                changeType="positive"
              />
              <StatsCard
                title="Total séquestré"
                value={`${totalEscrowed.toLocaleString()} FCFA`}
                icon={Lock}
                description="Fonds protégés"
              />
              <StatsCard
                title="Complétés"
                value={completedEscrows.filter(e => e.status === "COMPLETED").length}
                icon={CheckCircle2}
                change="Ce mois"
                changeType="positive"
              />
              <StatsCard
                title="Remboursés"
                value={completedEscrows.filter(e => e.status === "REFUNDED").length}
                icon={RefreshCw}
                description="Objet non récupéré"
              />
            </div>

            <Tabs defaultValue="active">
              <TabsList>
                <TabsTrigger value="active">
                  Actifs ({activeEscrows.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Historique ({completedEscrows.length})
                </TabsTrigger>
              </TabsList>

              {/* Active escrows */}
              <TabsContent value="active" className="mt-4 space-y-4">
                {activeEscrows.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        Aucun escrow actif
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Créez une récompense pour activer la protection escrow.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  activeEscrows.map((escrow) => {
                    const statusInfo = getStatusInfo(escrow.status);
                    return (
                      <Card key={escrow.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-start gap-3">
                              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Package className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{escrow.reference}</h3>
                                  <Badge variant={statusInfo.variant} className="text-[10px]">
                                    {statusInfo.label}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground font-mono mt-0.5">
                                  {escrow.reference}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-primary">
                                {escrow.amount.toLocaleString()} FCFA
                              </p>
                            </div>
                          </div>

                          {/* Progress */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">
                                Progression du retour
                              </span>
                              <span className="text-muted-foreground">
                                {escrow.daysLeft} jours restants
                              </span>
                            </div>
                            <Progress value={escrow.progress} className="h-2" />
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Acheteur</p>
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{escrow.buyer.name}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Retrouveur</p>
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{escrow.seller.name}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Créé le</p>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{formatDate(escrow.createdAt)}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Lieu</p>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{escrow.location || "Non spécifié"}</span>
                              </div>
                            </div>
                          </div>

                          <Separator className="mb-4" />

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href="/messages">
                                Contacter
                              </Link>
                            </Button>
                            {escrow.status === "RETURN_CONFIRMED" && (
                              <Button variant="outline" size="sm" className="ml-auto" onClick={async () => {
                                await escrowApi.complete(escrow.id);
                                setEscrows(prev => prev.map(e => e.id === escrow.id ? { ...e, status: "COMPLETED" } : e));
                              }}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Confirmer réception
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}

                {/* How it works */}
                <Card className="border-dashed">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Comment fonctionne l&apos;escrow ?
                    </h3>
                    <div className="grid md:grid-cols-4 gap-4">
                      {[
                        { step: "1", title: "Récompense", desc: "L'acheteur définit la récompense" },
                        { step: "2", title: "Séquestre", desc: "Les fonds sont sécurisés par RetrouvIt" },
                        { step: "3", title: "Retour", desc: "Le retrouveur retourne l'objet" },
                        { step: "4", title: "Libération", desc: "Les fonds sont versés au retrouveur" },
                      ].map((s) => (
                        <div key={s.step} className="text-center">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-sm font-bold text-primary">
                            {s.step}
                          </div>
                          <p className="text-sm font-medium">{s.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Completed escrows */}
              <TabsContent value="completed" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    {completedEscrows.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Package className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">Aucun escrow complété</p>
                      </div>
                    ) : (
                      completedEscrows.map((escrow) => {
                        const statusInfo = getStatusInfo(escrow.status);
                        return (
                          <div
                            key={escrow.id}
                            className="flex items-center justify-between p-4 border-b last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{escrow.reference}</p>
                                <p className="text-xs text-muted-foreground">
                                  {escrow.buyer.name} → {escrow.seller.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant={statusInfo.variant} className="text-[10px]">
                                {statusInfo.label}
                              </Badge>
                              <span className="text-sm font-semibold">
                                {escrow.amount.toLocaleString()} FCFA
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </MainLayout>
  );
}
