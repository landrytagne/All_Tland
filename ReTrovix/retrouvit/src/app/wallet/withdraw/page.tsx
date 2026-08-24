"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, CreditCard, Smartphone } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export default function WithdrawPage() {
  return (
    <MainLayout showFooter={false}>
      <WithdrawContent />
    </MainLayout>
  );
}

function WithdrawContent() {
  const { t } = useTranslation();

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
            <span className="text-lg font-bold">{formatCurrency(45000)}</span>
          </div>
        </CardContent>
      </Card>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("wallet.withdrawalMethod")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("wallet.platform")}</Label>
              <Select>
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
              <Input id="phone" placeholder="+237 6XX XXX XXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">{t("wallet.withdrawAmount")}</Label>
              <Input id="amount" type="number" placeholder={t("wallet.withdrawAmountPlaceholder")} />
              <p className="text-xs text-muted-foreground">
                {t("wallet.withdrawMinFee")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg">
          {t("wallet.confirmWithdraw")}
        </Button>
      </form>
    </div>
  );
}
