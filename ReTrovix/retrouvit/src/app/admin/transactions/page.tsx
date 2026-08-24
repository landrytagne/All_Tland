"use client";

import * as React from "react";
import {
  CreditCard,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Search,
  RefreshCw,
  Download,
  Eye,
  XCircle,
  Smartphone,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StatsCard } from "@/components/stats-card";
import {
  adminPaymentsApi,
  type PaymentResponse,
  type AdminPaymentStats,
} from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const providerConfig: Record<string, { label: string; color: string; icon: string }> = {
  MTN_MOMO: { label: "MTN MoMo", color: "bg-yellow-500", icon: "📱" },
  ORANGE_MONEY: { label: "Orange Money", color: "bg-orange-500", icon: "🟠" },
  WAVE: { label: "Wave", color: "bg-blue-500", icon: "🌊" },
};

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  COMPLETED: { label: "Complété", variant: "success", icon: CheckCircle2 },
  PENDING: { label: "En attente", variant: "warning", icon: Clock },
  PROCESSING: { label: "En cours", variant: "warning", icon: RefreshCw },
  FAILED: { label: "Échoué", variant: "destructive", icon: XCircle },
};

export default function AdminTransactionsPage() {
  const { t } = useTranslation();
  const [payments, setPayments] = React.useState<PaymentResponse[]>([]);
  const [stats, setStats] = React.useState<AdminPaymentStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [providerFilter, setProviderFilter] = React.useState("all");
  const [selectedPayment, setSelectedPayment] = React.useState<PaymentResponse | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [paymentsData, statsData] = await Promise.allSettled([
        adminPaymentsApi.getAll(),
        adminPaymentsApi.getStats(),
      ]);
      if (paymentsData.status === "fulfilled") setPayments(paymentsData.value);
      if (statsData.status === "fulfilled") setStats(statsData.value);
    } catch (err) {
      console.warn("Could not fetch admin payment data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchData();
      return;
    }
    setIsLoading(true);
    try {
      const results = await adminPaymentsApi.search(searchQuery);
      setPayments(results);
    } catch {
      // fallback to all
      fetchData();
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = payments.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesProvider = providerFilter === "all" || p.provider === providerFilter;
    const matchesSearch =
      !searchQuery ||
      p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.phoneNumber && p.phoneNumber.includes(searchQuery)) ||
      (p.failureReason && p.failureReason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesProvider && matchesSearch;
  });

  const totalDeposited = stats?.totalDeposited ?? payments.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0);
  const pendingAmount = stats?.pendingAmount ?? payments.filter((p) => p.status === "PENDING" || p.status === "PROCESSING").reduce((s, p) => s + p.amount, 0);
  const totalCount = stats?.totalPayments ?? payments.length;
  const completedCount = stats?.byStatus?.COMPLETED ?? payments.filter((p) => p.status === "COMPLETED").length;
  const pendingCount = stats?.pendingCount ?? payments.filter((p) => p.status === "PENDING" || p.status === "PROCESSING").length;
  const failedCount = stats?.byStatus?.FAILED ?? payments.filter((p) => p.status === "FAILED").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            {t("adminTransactions.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("adminTransactions.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            {t("wallet.exportCsv") ? "Actualiser" : "Actualiser"}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("adminTransactions.totalTransactions")}
          value={totalCount.toString()}
          icon={CreditCard}
          description={`${completedCount} ${t("wallet.completed").toLowerCase()}`}
        />
        <StatsCard
          title={t("adminTransactions.totalVolume")}
          value={formatCurrency(totalDeposited)}
          icon={TrendingUp}
          change={stats ? `+${((completedCount / Math.max(totalCount, 1)) * 100).toFixed(0)}%` : undefined}
          changeType="positive"
        />
        <StatsCard
          title={t("adminTransactions.pendingEscrows")}
          value={pendingCount.toString()}
          icon={Clock}
          description={formatCurrency(pendingAmount)}
        />
        <StatsCard
          title={t("wallet.failed")}
          value={failedCount.toString()}
          icon={XCircle}
          description={failedCount > 0 ? `${((failedCount / Math.max(totalCount, 1)) * 100).toFixed(1)}%` : undefined}
        />
      </div>

      {/* Provider Breakdown */}
      {stats?.byProvider && (
        <div className="grid gap-3 grid-cols-3">
          {Object.entries(stats.byProvider).map(([provider, count]) => {
            const config = providerConfig[provider];
            if (!config) return null;
            return (
              <Card key={provider}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${config.color} flex items-center justify-center text-xl`}>
                    {config.icon}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                    <p className="text-lg font-bold">{count}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par référence, téléphone, raison..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("wallet.allStatuses")}</SelectItem>
            <SelectItem value="COMPLETED">{t("wallet.completed")}</SelectItem>
            <SelectItem value="PENDING">{t("wallet.pending")}</SelectItem>
            <SelectItem value="PROCESSING">En cours</SelectItem>
            <SelectItem value="FAILED">{t("wallet.failed")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Fournisseur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="MTN_MOMO">MTN MoMo</SelectItem>
            <SelectItem value="ORANGE_MONEY">Orange Money</SelectItem>
            <SelectItem value="WAVE">Wave</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Chargement...</p>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <CreditCard className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Aucun paiement trouvé
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((payment) => {
                  const provider = providerConfig[payment.provider];
                  const status = statusConfig[payment.status] || statusConfig.FAILED;
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            {provider ? (
                              <span className="text-lg">{provider.icon}</span>
                            ) : (
                              <Smartphone className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium font-mono">{payment.reference}</p>
                            {payment.externalReference && (
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {payment.externalReference}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {provider?.label || payment.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-sm font-semibold ${
                            payment.status === "COMPLETED"
                              ? "text-emerald-600"
                              : payment.status === "FAILED"
                              ? "text-red-600"
                              : "text-foreground"
                          }`}
                        >
                          {formatCurrency(payment.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {payment.phoneNumber || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="text-[10px] gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(payment.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Results count */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("wallet.showingResults")} {filtered.length} {t("wallet.on")} {payments.length} paiements
          </p>
        </div>
      )}

      {/* Payment Detail Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Détails du paiement
            </DialogTitle>
            <DialogDescription>{selectedPayment?.reference}</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              {/* Status banner */}
              <div
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  selectedPayment.status === "COMPLETED"
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800"
                    : selectedPayment.status === "FAILED"
                    ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
                    : "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
                }`}
              >
                {(() => {
                  const s = statusConfig[selectedPayment.status] || statusConfig.FAILED;
                  const SIcon = s.icon;
                  return (
                    <>
                      <SIcon className={`h-5 w-5 ${
                        selectedPayment.status === "COMPLETED"
                          ? "text-emerald-600"
                          : selectedPayment.status === "FAILED"
                          ? "text-red-600"
                          : "text-amber-600"
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{selectedPayment.reference}</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Amount */}
              <div className="text-center py-4">
                <p className="text-3xl font-bold">{formatCurrency(selectedPayment.amount)}</p>
                <p className="text-sm text-muted-foreground">{selectedPayment.currency}</p>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fournisseur</span>
                  <span className="font-medium">{providerConfig[selectedPayment.provider]?.label || selectedPayment.provider}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Méthode</span>
                  <span className="font-medium">{selectedPayment.method}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Téléphone</span>
                  <span className="font-medium font-mono">{selectedPayment.phoneNumber || "—"}</span>
                </div>
                {selectedPayment.externalReference && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Réf. externe</span>
                    <span className="font-medium font-mono text-xs">{selectedPayment.externalReference}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Créé le</span>
                  <span className="font-medium">{formatDate(selectedPayment.createdAt)}</span>
                </div>
                {selectedPayment.completedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Complété le</span>
                    <span className="font-medium">{formatDate(selectedPayment.completedAt)}</span>
                  </div>
                )}
                {selectedPayment.failureReason && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 dark:text-red-400">{selectedPayment.failureReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
