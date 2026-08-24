"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Plus,
  Download,
  History,
  Loader2,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TransactionItem } from "@/components/transaction-item";
import { StatsCard } from "@/components/stats-card";
import { walletApi, type TransactionResponse } from "@/lib/api";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export default function WalletPage() {
  return (
    <AuthGuard>
      <WalletContent />
    </AuthGuard>
  );
}

function WalletContent() {
  const { t } = useTranslation();
  const [balance, setBalance] = React.useState(0);
  const [transactions, setTransactions] = React.useState<TransactionResponse[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [balData, txData] = await Promise.allSettled([
          walletApi.getBalance(),
          walletApi.getTransactions(),
        ]);

        if (balData.status === "fulfilled") setBalance(balData.value.balance);
        if (txData.status === "fulfilled") setTransactions(txData.value);
      } catch (err) {
        console.warn("Could not fetch wallet data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalEarned = transactions
    .filter((tx) => tx.type === "REWARD" && tx.status === "COMPLETED")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalSpent = transactions
    .filter((tx) => tx.type === "WITHDRAWAL" && tx.status === "COMPLETED")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            {t("wallet.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("wallet.description")}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Balance Card */}
            <Card className="mb-6 bg-primary text-primary-foreground">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">{t("wallet.balance")}</p>
                    <p className="text-3xl font-bold mt-1">{formatCurrency(balance)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/wallet/deposit">
                      <Button variant="secondary" size="sm" className="gap-1">
                        <Plus className="h-3 w-3" />
                        {t("wallet.deposit")}
                      </Button>
                    </Link>
                    <Link href="/wallet/withdraw">
                      <Button variant="secondary" size="sm" className="gap-1">
                        <Download className="h-3 w-3" />
                        {t("wallet.withdraw")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deposit CTA when balance is low */}
            {balance < 5000 && (
              <Card className="mb-6 border-dashed border-2 border-forest/30 dark:border-forest-light/30 bg-forest/5 dark:bg-forest-light/5">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-forest/10 dark:bg-forest-light/10 flex items-center justify-center shrink-0">
                    <Plus className="h-7 w-7 text-forest dark:text-forest-light" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="font-semibold">Besoin de créditer votre portefeuille ?</p>
                    <p className="text-sm text-muted-foreground">
                      Déposez des fonds via MTN MoMo, Orange Money ou Wave en quelques secondes.
                    </p>
                  </div>
                  <Link href="/wallet/deposit">
                    <Button className="bg-forest hover:bg-forest/90 dark:bg-forest-light dark:hover:bg-forest-light/90 gap-2">
                      <Plus className="h-4 w-4" />
                      {t("wallet.depositFunds")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-6">
              <StatsCard
                title={t("wallet.totalEarned")}
                value={formatCurrency(totalEarned)}
                icon={ArrowDownLeft}
                change={t("wallet.thisMonthEarnings")}
                changeType="positive"
              />
              <StatsCard
                title={t("wallet.totalSpent")}
                value={formatCurrency(totalSpent)}
                icon={ArrowUpRight}
                description={t("wallet.rewardsPaid")}
              />
              <StatsCard
                title={t("wallet.totalTransactions")}
                value={transactions.length}
                icon={History}
                description={t("wallet.thisMonth")}
              />
            </div>

            {/* Transactions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    {t("wallet.transactionHistory")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <TransactionItem
                      key={tx.id}
                      type={tx.type.toLowerCase() as "reward" | "escrow" | "withdrawal" | "refund"}
                      amount={tx.type === "WITHDRAWAL" ? -tx.amount : tx.amount}
                      status={tx.status.toLowerCase() as "pending" | "completed" | "failed"}
                      description={tx.description}
                      createdAt={tx.createdAt}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <History className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">{t("wallet.noTransactions")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
