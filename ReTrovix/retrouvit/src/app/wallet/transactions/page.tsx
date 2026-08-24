"use client";

import { useState } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Download,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  TrendingUp,
  RefreshCw,
  Wallet,
  Gift,
  Shield,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Eye,
  Clock,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { StatsCard } from "@/components/stats-card";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface Transaction {
  id: string;
  type: "reward_in" | "reward_out" | "escrow_in" | "escrow_out" | "withdrawal" | "refund" | "deposit";
  amount: number;
  status: "completed" | "pending" | "failed";
  description: string;
  counterparty?: string;
  reference: string;
  date: string;
}

const allTransactions: Transaction[] = [
  { id: "TX-8901", type: "reward_in", amount: 25000, status: "completed", description: "Récompense reçue — iPhone 15 Pro Max", counterparty: "Marie Ngono", reference: "OBJ-L-001", date: "2025-08-17T12:00:00Z" },
  { id: "TX-8900", type: "escrow_in", amount: 15000, status: "pending", description: "Escrow créé — Clés Toyota Corolla", counterparty: "Paul Fouda", reference: "ESC-2025-08-178", date: "2025-08-18T14:30:00Z" },
  { id: "TX-8899", type: "withdrawal", amount: -20000, status: "completed", description: "Retrait vers Mobile Money", reference: "WD-2025-08-192", date: "2025-08-18T16:00:00Z" },
  { id: "TX-8898", type: "reward_in", amount: 30000, status: "completed", description: "Récompense reçue — Portefeuille cuir", counterparty: "Sophie Biya", reference: "OBJ-L-003", date: "2025-08-10T16:00:00Z" },
  { id: "TX-8897", type: "refund", amount: 10000, status: "completed", description: "Remboursement escrow — Bague or non récupérée", counterparty: "Paul Fouda", reference: "ESC-2025-06-112", date: "2025-07-28T09:00:00Z" },
  { id: "TX-8896", type: "reward_in", amount: 50000, status: "completed", description: "Récompense reçue — Sac à dos Samsonite", counterparty: "Jean Kamga", reference: "OBJ-L-004", date: "2025-08-05T12:00:00Z" },
  { id: "TX-8895", type: "deposit", amount: 20000, status: "completed", description: "Dépôt via Mobile Money", reference: "DP-2025-08-145", date: "2025-08-01T10:00:00Z" },
  { id: "TX-8894", type: "escrow_out", amount: -10000, status: "completed", description: "Escrow libéré — Clés BMW retournées", counterparty: "Paul Fouda", reference: "ESC-2025-07-156", date: "2025-07-28T09:30:00Z" },
  { id: "TX-8893", type: "reward_in", amount: 10000, status: "completed", description: "Récompense reçue — Clés BMW", counterparty: "Paul Fouda", reference: "OBJ-L-002", date: "2025-07-20T14:00:00Z" },
  { id: "TX-8892", type: "withdrawal", amount: -30000, status: "completed", description: "Retrait vers Mobile Money", reference: "WD-2025-07-180", date: "2025-07-15T11:00:00Z" },
  { id: "TX-8891", type: "reward_in", amount: 20000, status: "completed", description: "Récompense reçue — Laptop Dell", counterparty: "Landry Tagne", reference: "OBJ-F-005", date: "2025-07-10T08:00:00Z" },
  { id: "TX-8890", type: "escrow_out", amount: -25000, status: "completed", description: "Escrow libéré — Portefeuille retourné", counterparty: "Marie Ngono", reference: "ESC-2025-06-134", date: "2025-07-05T16:00:00Z" },
];

const typeConfig: Record<string, { labelKey: string; icon: typeof TrendingUp; color: string }> = {
  reward_in: { labelKey: "wallet.typeRewardIn", icon: Gift, color: "text-emerald-500" },
  reward_out: { labelKey: "wallet.typeRewardOut", icon: ArrowUpRight, color: "text-red-500" },
  escrow_in: { labelKey: "wallet.typeEscrowIn", icon: Shield, color: "text-amber-500" },
  escrow_out: { labelKey: "wallet.typeEscrowOut", icon: RefreshCw, color: "text-blue-500" },
  withdrawal: { labelKey: "wallet.typeWithdrawal", icon: ArrowUpRight, color: "text-red-500" },
  refund: { labelKey: "wallet.typeRefund", icon: RefreshCw, color: "text-emerald-500" },
  deposit: { labelKey: "wallet.typeDeposit", icon: ArrowDownLeft, color: "text-emerald-500" },
};

const statusConfig: Record<string, { labelKey: string; variant: "success" | "warning" | "destructive" }> = {
  completed: { labelKey: "wallet.completed", variant: "success" },
  pending: { labelKey: "wallet.pending", variant: "warning" },
  failed: { labelKey: "wallet.failed", variant: "destructive" },
};

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { t } = useTranslation();

  const filtered = allTransactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.counterparty && tx.counterparty.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalIncome = allTransactions
    .filter((tx) => tx.amount > 0 && tx.status === "completed")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenses = allTransactions
    .filter((tx) => tx.amount < 0 && tx.status === "completed")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href="/wallet">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t("wallet.backToWallet")}
            </Link>
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <History className="h-6 w-6" />
                {t("wallet.transactionsTitle")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {allTransactions.length} {t("wallet.transactionsTotal")}
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              {t("wallet.exportCsv")}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
          <StatsCard
            title={t("wallet.totalIncome")}
            value={formatCurrency(totalIncome)}
            icon={ArrowDownLeft}
            change={`${allTransactions.filter((tx) => tx.amount > 0).length} ${t("wallet.transactionsLowercase")}`}
            changeType="positive"
          />
          <StatsCard
            title={t("wallet.totalExpenses")}
            value={formatCurrency(totalExpenses)}
            icon={ArrowUpRight}
            change={`${allTransactions.filter((tx) => tx.amount < 0).length} ${t("wallet.transactionsLowercase")}`}
          />
          <StatsCard
            title={t("wallet.pending")}
            value={formatCurrency(
              allTransactions.filter((tx) => tx.status === "pending").reduce((s, tx) => s + Math.abs(tx.amount), 0)
            )}
            icon={Clock}
            description={`${allTransactions.filter((tx) => tx.status === "pending").length} ${t("wallet.transactionsLowercase")}`}
          />
          <StatsCard
            title={t("wallet.currentBalance")}
            value={formatCurrency(totalIncome - totalExpenses)}
            icon={Wallet}
            change={t("wallet.available")}
            changeType="positive"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("wallet.searchTransactions")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("wallet.type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("wallet.allTypes")}</SelectItem>
              <SelectItem value="reward_in">{t("wallet.rewardReceived")}</SelectItem>
              <SelectItem value="escrow_in">{t("wallet.escrowCreated")}</SelectItem>
              <SelectItem value="escrow_out">{t("wallet.escrowReleased")}</SelectItem>
              <SelectItem value="withdrawal">{t("wallet.withdrawals")}</SelectItem>
              <SelectItem value="refund">{t("wallet.refunds")}</SelectItem>
              <SelectItem value="deposit">{t("wallet.deposits")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("wallet.statusFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("wallet.allStatuses")}</SelectItem>
              <SelectItem value="completed">{t("wallet.completed")}</SelectItem>
              <SelectItem value="pending">{t("wallet.pending")}</SelectItem>
              <SelectItem value="failed">{t("wallet.failed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("wallet.colTransaction")}</TableHead>
                  <TableHead>{t("wallet.type")}</TableHead>
                  <TableHead>{t("wallet.colCounterparty")}</TableHead>
                  <TableHead>{t("wallet.colAmount")}</TableHead>
                  <TableHead>{t("wallet.statusFilter")}</TableHead>
                  <TableHead>{t("wallet.colDate")}</TableHead>
                  <TableHead className="text-right">{t("wallet.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {t("wallet.noTransactionsFound")}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((tx) => {
                    const typeInfo = typeConfig[tx.type];
                    const statusInfo = statusConfig[tx.status];
                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <typeInfo.icon className={`h-4 w-4 ${typeInfo.color}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium line-clamp-1 max-w-[250px]">
                                {tx.description}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {tx.id}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {t(typeInfo.labelKey)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tx.counterparty || "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-sm font-semibold ${
                              tx.amount >= 0 ? "text-emerald-600" : "text-foreground"
                            }`}
                          >
                            {tx.amount >= 0 ? "+" : ""}
                            {formatCurrency(tx.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className="text-[10px]">
                            {t(statusInfo.labelKey)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(tx.date)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
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

        {/* Pagination placeholder */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {t("wallet.showingResults")} {filtered.length} {t("wallet.on")} {allTransactions.length} {t("wallet.transactionsLowercase")}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="default" size="sm" className="h-8 w-8">
                1
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8">
                2
              </Button>
              <Button variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
