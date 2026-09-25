"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { walletApi, type WithdrawalResponse } from "@/lib/api-admin";

export default function WithdrawPage() {
  return (
    <MainLayout showFooter={false}>
      <AuthGuard>
        <WithdrawContent />
      </AuthGuard>
    </MainLayout>
  );
}

const METHOD_MAP: Record<string, string> = {
  mtn: "MTN_MOMO",
  orange: "ORANGE_MONEY",
  bank: "BANK_TRANSFER",
};

function WithdrawContent() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();

  const [method, setMethod] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState<WithdrawalResponse | null>(null);
  const [history, setHistory] = React.useState<WithdrawalResponse[]>([]);

  const loadHistory = React.useCallback(async () => {
    try {
      setHistory(await walletApi.getWithdrawals());
    } catch {
      // silencieux : l'historique est secondaire
    }
  }, []);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(null);

    const numAmount = Number(amount);
    if (!method) {
      setError("Choisissez une plateforme de retrait.");
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setError("Saisissez un montant valide.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await walletApi.withdraw({
        amount: numAmount,
        method: METHOD_MAP[method] ?? method,
        phoneNumber: phoneNumber || undefined,
      });
      setSuccess(res);
      setAmount("");
      setPhoneNumber("");
      await refreshUser(); // met à jour le solde affiché dans la navbar
      loadHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Échec de la demande de retrait");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadge = (status: WithdrawalResponse["status"]) => {
    switch (status) {
      case "COMPLETED":
        return <span className="text-emerald-600 font-medium">Terminé</span>;
      case "PENDING_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
            <Clock className="h-3 w-3" /> Validation finance
          </span>
        );
      case "PROCESSING":
        return <span className="text-blue-600 font-medium">En cours</span>;
      case "FAILED":
      case "REJECTED":
        return <span className="text-destructive font-medium">Échoué / Rejeté</span>;
      default:
        return status;
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:px-6">
      <Link
        href="/wallet"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("wallet.backToWallet")}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("wallet.withdrawFunds")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("wallet.withdrawDesc")}
        </p>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("wallet.balance")}</span>
            <span className="text-lg font-bold">{formatCurrency(user?.walletBalance ?? 0)}</span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <span className="text-destructive">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-emerald-800 dark:text-emerald-300">
            <p className="font-medium">
              Demande {success.reference} enregistrée — {formatCurrency(success.amount)}
            </p>
            <p className="text-xs mt-1">
              {success.status === "PENDING_REVIEW"
                ? "Montant supérieur au seuil anti-fraude : validation manuelle par notre équipe finance avant transfert."
                : "Transfert en cours vers votre compte Mobile Money."}
            </p>
          </div>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("wallet.withdrawalMethod")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("wallet.platform")}</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue placeholder={t("wallet.selectPlatform")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                  <SelectItem value="orange">Orange Money</SelectItem>
                  <SelectItem value="bank">Virement bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("wallet.phoneNumberOrRib")}</Label>
              <Input
                id="phone"
                placeholder="+237 6XX XXX XXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">{t("wallet.withdrawAmount")}</Label>
              <Input
                id="amount"
                type="number"
                placeholder={t("wallet.withdrawAmountPlaceholder")}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {t("wallet.withdrawMinFee")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Traitement...
            </>
          ) : (
            t("wallet.confirmWithdraw")
          )}
        </Button>
      </form>

      {history.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Mes demandes de retrait</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.slice(0, 5).map((w) => (
              <div key={w.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{formatCurrency(w.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.reference} · {new Date(w.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                {statusBadge(w.status)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
