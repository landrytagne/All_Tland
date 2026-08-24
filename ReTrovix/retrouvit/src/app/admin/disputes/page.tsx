"use client";

import * as React from "react";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  adminDisputesApi,
  type ReturnRequestResponse,
  type DisputeStats,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";

export default function AdminDisputesPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [disputes, setDisputes] = React.useState<ReturnRequestResponse[]>([]);
  const [stats, setStats] = React.useState<DisputeStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedDispute, setSelectedDispute] = React.useState<ReturnRequestResponse | null>(null);
  const [resolveModalOpen, setResolveModalOpen] = React.useState(false);
  const [resolutionText, setResolutionText] = React.useState("");
  const [resolving, setResolving] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);

  // Redirect if not admin
  React.useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.push("/feed");
    }
  }, [user, router]);

  const fetchData = React.useCallback(async () => {
    try {
      const [disputesData, statsData] = await Promise.all([
        adminDisputesApi.getAll(),
        adminDisputesApi.getStats(),
      ]);
      setDisputes(disputesData);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to fetch disputes:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolutionText.trim()) return;
    setResolving(true);
    try {
      await adminDisputesApi.resolve(selectedDispute.id, resolutionText.trim());
      setResolveModalOpen(false);
      setResolutionText("");
      setSelectedDispute(null);
      await fetchData();
    } catch (err) {
      console.error("Failed to resolve dispute:", err);
    } finally {
      setResolving(false);
    }
  };

  const filteredDisputes = disputes.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.reference?.toLowerCase().includes(q) ||
      d.loser?.name?.toLowerCase().includes(q) ||
      d.finder?.name?.toLowerCase().includes(q) ||
      d.disputeReason?.toLowerCase().includes(q) ||
      d.lostObjectTitle?.toLowerCase().includes(q) ||
      d.foundObjectTitle?.toLowerCase().includes(q)
    );
  });

  const formatCurrency = (n: number) => new Intl.NumberFormat("fr-CM").format(n) + " XAF";

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-6 px-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            {locale === "fr" ? "Gestion des litiges" : "Dispute Resolution"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === "fr"
              ? "Examinez et résolvez les litiges entre utilisateurs"
              : "Review and resolve disputes between users"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          {locale === "fr" ? "Actualiser" : "Refresh"}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {locale === "fr" ? "Litiges ouverts" : "Open disputes"}
                  </p>
                  <p className="text-2xl font-bold text-amber-500">{stats.totalDisputes}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {locale === "fr" ? "Résolus" : "Resolved"}
                  </p>
                  <p className="text-2xl font-bold text-green-500">{stats.resolvedDisputes}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {locale === "fr" ? "Taux litige" : "Dispute rate"}
                  </p>
                  <p className="text-2xl font-bold">{stats.disputeRate}%</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {locale === "fr" ? "Frais plateforme" : "Platform fees"}
                  </p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalPlatformFees)}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={locale === "fr" ? "Rechercher par référence, nom, raison..." : "Search by reference, name, reason..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Disputes Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredDisputes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium">
              {locale === "fr" ? "Aucun litige en cours" : "No open disputes"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {locale === "fr"
                ? "Tous les litiges ont été résolus."
                : "All disputes have been resolved."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">
                      {locale === "fr" ? "Référence" : "Reference"}
                    </th>
                    <th className="text-left p-3 font-medium">
                      {locale === "fr" ? "Propriétaire" : "Owner"}
                    </th>
                    <th className="text-left p-3 font-medium">
                      {locale === "fr" ? "Retrouveur" : "Finder"}
                    </th>
                    <th className="text-left p-3 font-medium">
                      {locale === "fr" ? "Objet" : "Object"}
                    </th>
                    <th className="text-left p-3 font-medium">
                      {locale === "fr" ? "Montant" : "Amount"}
                    </th>
                    <th className="text-left p-3 font-medium">
                      {locale === "fr" ? "Raison" : "Reason"}
                    </th>
                    <th className="text-left p-3 font-medium">
                      {locale === "fr" ? "Date" : "Date"}
                    </th>
                    <th className="text-left p-3 font-medium">
                      {locale === "fr" ? "Actions" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDisputes.map((dispute) => (
                    <tr key={dispute.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <span className="font-mono text-xs">{dispute.reference}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {dispute.loser?.name?.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{dispute.loser?.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {dispute.finder?.name?.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{dispute.finder?.name}</span>
                        </div>
                      </td>
                      <td className="p-3 max-w-[150px]">
                        <span className="text-xs truncate block">
                          {dispute.lostObjectTitle || dispute.foundObjectTitle || "—"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs font-medium">
                          {dispute.acceptedAmount ? formatCurrency(dispute.acceptedAmount) : "—"}
                        </span>
                      </td>
                      <td className="p-3 max-w-[200px]">
                        <span className="text-xs text-destructive truncate block">
                          {dispute.disputeReason || "—"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-muted-foreground">
                          {dispute.createdAt ? new Date(dispute.createdAt).toLocaleDateString("fr") : "—"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setSelectedDispute(dispute)}
                            title={locale === "fr" ? "Voir détails" : "View details"}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-600 hover:bg-green-50"
                            onClick={() => {
                              setSelectedDispute(dispute);
                              setResolveModalOpen(true);
                            }}
                            title={locale === "fr" ? "Résoudre" : "Resolve"}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedDispute && !resolveModalOpen} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {locale === "fr" ? "Détail du litige" : "Dispute Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedDispute?.reference}
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
              {/* Parties */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">
                    {locale === "fr" ? "Propriétaire" : "Owner"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {selectedDispute.loser?.name?.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{selectedDispute.loser?.name}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">
                    {locale === "fr" ? "Retrouveur" : "Finder"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {selectedDispute.finder?.name?.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{selectedDispute.finder?.name}</span>
                  </div>
                </div>
              </div>

              {/* Object & Amount */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">
                  {locale === "fr" ? "Objet concerné" : "Object involved"}
                </p>
                <p className="text-sm font-medium">
                  {selectedDispute.lostObjectTitle || selectedDispute.foundObjectTitle || "—"}
                </p>
                {selectedDispute.acceptedAmount && (
                  <p className="text-sm text-primary font-medium mt-1">
                    Récompense : {formatCurrency(selectedDispute.acceptedAmount)}
                    <span className="text-xs text-muted-foreground ml-2">
                      (frais : {formatCurrency(selectedDispute.platformFee || 0)})
                    </span>
                  </p>
                )}
              </div>

              {/* Dispute Reason */}
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="text-xs text-destructive font-medium mb-1 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {locale === "fr" ? "Raison du litige" : "Dispute reason"}
                </p>
                <p className="text-sm">{selectedDispute.disputeReason || "—"}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Signalé par : {selectedDispute.disputedBy === selectedDispute.loser?.id
                    ? selectedDispute.loser?.name
                    : selectedDispute.finder?.name}
                </p>
              </div>

              {/* Timeline */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-2">
                  {locale === "fr" ? "Progression" : "Progress"}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="warning">{selectedDispute.status?.replace(/_/g, " ")}</Badge>
                  {selectedDispute.meetingDate && (
                    <span className="text-muted-foreground">
                      RDV : {new Date(selectedDispute.meetingDate).toLocaleDateString("fr")}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => setResolveModalOpen(true)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {locale === "fr" ? "Résoudre ce litige" : "Resolve this dispute"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedDispute(null)}>
                  {locale === "fr" ? "Fermer" : "Close"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Modal */}
      <Dialog open={resolveModalOpen} onOpenChange={() => { setResolveModalOpen(false); setResolutionText(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              {locale === "fr" ? "Résoudre le litige" : "Resolve dispute"}
            </DialogTitle>
            <DialogDescription>
              {selectedDispute?.reference} — {selectedDispute?.lostObjectTitle || selectedDispute?.foundObjectTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <p className="text-xs text-destructive font-medium mb-1">
                {locale === "fr" ? "Raison du litige" : "Dispute reason"}
              </p>
              <p className="text-sm">{selectedDispute?.disputeReason}</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                {locale === "fr" ? "Décision de résolution" : "Resolution decision"}
              </label>
              <Textarea
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                placeholder={
                  locale === "fr"
                    ? "Décrivez la résolution : remboursement partiel, validation du paiement, exclusion..."
                    : "Describe the resolution: partial refund, payment validation, exclusion..."
                }
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleResolve}
                disabled={!resolutionText.trim() || resolving}
              >
                {resolving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                {locale === "fr" ? "Confirmer la résolution" : "Confirm resolution"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setResolveModalOpen(false); setResolutionText(""); }}
              >
                {locale === "fr" ? "Annuler" : "Cancel"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
