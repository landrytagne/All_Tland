"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowLeft,
  Smartphone,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Zap,
  Clock,
  X,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { paymentsApi, type PaymentResponse } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const PAYMENT_PROVIDERS = [
  {
    id: "MTN_MOMO",
    name: "MTN Mobile Money",
    shortName: "MTN MoMo",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    icon: "📱",
    descriptionFR: "Payez avec votre compte MTN Mobile Money",
    descriptionEN: "Pay with your MTN Mobile Money account",
  },
  {
    id: "ORANGE_MONEY",
    name: "Orange Money",
    shortName: "Orange Money",
    color: "bg-orange-500",
    textColor: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: "🟠",
    descriptionFR: "Payez avec votre compte Orange Money",
    descriptionEN: "Pay with your Orange Money account",
  },
  {
    id: "WAVE",
    name: "Wave",
    shortName: "Wave",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: "🌊",
    descriptionFR: "Payez avec votre compte Wave",
    descriptionEN: "Pay with your Wave account",
  },
];

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000, 25000, 50000];

export default function DepositPage() {
  return (
    <AuthGuard>
      <DepositContent />
    </AuthGuard>
  );
}

function DepositContent() {
  const { t, locale } = useTranslation();
  const [selectedProvider, setSelectedProvider] = React.useState<string | null>(null);
  const [amount, setAmount] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [paymentResult, setPaymentResult] = React.useState<PaymentResponse | null>(null);
  const [error, setError] = React.useState("");

  const selectedProviderData = PAYMENT_PROVIDERS.find((p) => p.id === selectedProvider);
  const parsedAmount = parseInt(amount.replace(/\s/g, ""), 10);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount >= 100;
  const isValidPhone = phoneNumber.length >= 9;
  const canSubmit = selectedProvider && isValidAmount && isValidPhone && !isProcessing;

  const handleAmountSelect = (value: number) => {
    setAmount(value.toLocaleString("fr-FR"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsProcessing(true);
    setError("");

    try {
      const result = await paymentsApi.initiate({
        provider: selectedProvider!,
        method: "MOBILE_MONEY",
        amount: parsedAmount,
        phoneNumber: phoneNumber.startsWith("+") ? phoneNumber : `+237${phoneNumber}`,
      });

      setPaymentResult(result);

      if (result.status === "FAILED") {
        setError(result.failureReason || t("wallet.paymentFailedDesc"));
      }
    } catch (err: any) {
      setError(err.message || t("wallet.paymentFailedDesc"));
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedProvider(null);
    setAmount("");
    setPhoneNumber("");
    setPaymentResult(null);
    setError("");
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/wallet" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="h-4 w-4" />
            {t("wallet.backToWallet")}
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-forest dark:text-forest-light" />
            {t("wallet.depositFunds")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("wallet.depositDesc")}
          </p>
        </div>

        {/* Payment Result */}
        {paymentResult ? (
          <Card className="animate-fade-in">
            <CardContent className="p-6 text-center">
              {paymentResult.status === "COMPLETED" ? (
                <>
                  <div className="h-16 w-16 rounded-full bg-forest/10 dark:bg-forest-light/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-forest dark:text-forest-light" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">{t("wallet.paymentSuccess")}</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {formatCurrency(paymentResult.amount)} {t("wallet.paymentSuccessDesc")}
                  </p>
                </>
              ) : paymentResult.status === "PROCESSING" ? (
                <>
                  <div className="h-16 w-16 rounded-full bg-orange-brand/10 flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-orange-brand animate-pulse" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">{t("wallet.paymentProcessing")}</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("wallet.paymentProcessingDesc")}
                  </p>
                </>
              ) : (
                <>
                  <div className="h-16 w-16 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center mx-auto mb-4">
                    <X className="h-8 w-8 text-red-500" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">{t("wallet.paymentFailed")}</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {paymentResult.failureReason || t("wallet.paymentFailedDesc")}
                  </p>
                </>
              )}

              {/* Details */}
              <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("wallet.reference")}</span>
                  <span className="font-mono font-medium">{paymentResult.reference}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("wallet.amount")}</span>
                  <span className="font-medium">{formatCurrency(paymentResult.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("wallet.provider")}</span>
                  <span className="font-medium">{paymentResult.provider}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("wallet.status")}</span>
                  <Badge variant={paymentResult.status === "COMPLETED" ? "default" : "destructive"}>
                    {paymentResult.status}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  {t("wallet.newDeposit")}
                </Button>
                <Link href="/wallet" className="flex-1">
                  <Button className="w-full bg-forest hover:bg-forest/90 dark:bg-forest-light dark:hover:bg-forest-light/90">
                    {t("wallet.viewWallet")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Error */}
            {error && (
              <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm animate-fade-in">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-destructive">{error}</span>
              </div>
            )}

            {/* Step 1: Provider */}
            <Card className="mb-4 animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  {t("wallet.chooseProvider")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {PAYMENT_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      selectedProvider === provider.id
                        ? `${provider.borderColor} ${provider.bgColor} ring-2 ring-offset-2 ring-offset-background`
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-xl ${provider.color} flex items-center justify-center text-2xl shadow-lg`}>
                      {provider.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">{provider.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {locale === "fr" ? provider.descriptionFR : provider.descriptionEN}
                      </p>
                    </div>
                    {selectedProvider === provider.id && (
                      <CheckCircle2 className={`h-5 w-5 ${provider.textColor}`} />
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Step 2: Amount */}
            <Card className="mb-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  {t("wallet.enterAmount")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="amount">{t("wallet.amountLabel")}</Label>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="numeric"
                    placeholder={t("wallet.amountPlaceholder")}
                    value={amount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\s/g, "");
                      if (/^\d*$/.test(raw)) {
                        setAmount(raw ? parseInt(raw).toLocaleString("fr-FR") : "");
                      }
                    }}
                    className="text-lg font-semibold h-12 mt-1"
                  />
                  {parsedAmount > 0 && parsedAmount < 100 && (
                    <p className="text-xs text-destructive mt-1">{t("wallet.minAmount")}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">{t("wallet.quickAmounts")}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_AMOUNTS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAmountSelect(preset)}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                          parsedAmount === preset
                            ? "bg-forest text-white border-forest dark:bg-forest-light dark:border-forest-light"
                            : "border-border hover:border-forest/50 hover:bg-forest/5 dark:hover:bg-forest-light/5"
                        }`}
                      >
                        {preset.toLocaleString("fr-FR")}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Phone Number */}
            <Card className="mb-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {t("wallet.enterPhone")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="phone">{t("wallet.phoneLabel")}</Label>
                  <div className="flex mt-1">
                    <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-lg text-sm text-muted-foreground">
                      +237
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="6XX XXX XXX"
                      value={phoneNumber}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\s/g, "");
                        if (/^\d*$/.test(raw) && raw.length <= 9) {
                          setPhoneNumber(raw);
                        }
                      }}
                      className="rounded-l-none"
                    />
                  </div>
                  {phoneNumber && !isValidPhone && (
                    <p className="text-xs text-destructive mt-1">{t("wallet.phoneInvalid")}</p>
                  )}
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-forest/5 dark:bg-forest-light/5 border border-forest/10 dark:border-forest-light/10">
                  <Shield className="h-4 w-4 text-forest dark:text-forest-light shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    {t("wallet.phoneSecure")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Summary & Submit */}
            <Card className="animate-fade-in" style={{ animationDelay: "300ms" }}>
              <CardContent className="p-4">
                {selectedProviderData && parsedAmount > 0 && (
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("wallet.provider")}</span>
                      <span className="font-medium">{selectedProviderData.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("wallet.amount")}</span>
                      <span className="font-bold text-lg">{formatCurrency(parsedAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("wallet.fees")}</span>
                      <span className="font-medium text-forest dark:text-forest-light">{t("wallet.free")}</span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-forest hover:bg-forest/90 dark:bg-forest-light dark:hover:bg-forest-light/90 shadow-lg shadow-forest/20 dark:shadow-forest-light/20 rounded-xl font-medium"
                  disabled={!canSubmit}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("wallet.processing")}
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      {t("wallet.confirmDeposit")} {parsedAmount > 0 ? formatCurrency(parsedAmount) : ""}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </MainLayout>
  );
}
