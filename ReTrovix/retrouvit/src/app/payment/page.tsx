"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Wallet,
  Smartphone,
  ArrowLeft,
  ArrowRight,
  Check,
  Shield,
  Lock,
  AlertCircle,
  MapPin,
  Package,
  Clock,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";

const steps = ["Détails", "Montant", "Paiement", "Confirmation"];

const paymentMethods = [
  {
    id: "mobile_money",
    name: "Mobile Money",
    description: "MTN MoMo, Orange Money",
    icon: Smartphone,
    fees: "Gratuit",
  },
  {
    id: "wallet",
    name: "Portefeuille RetrouvIt",
    description: "Solde disponible : 45 000 FCFA",
    icon: Wallet,
    fees: "Gratuit",
  },
  {
    id: "card",
    name: "Carte bancaire",
    description: "Visa, Mastercard",
    icon: CreditCard,
    fees: "2% de frais",
  },
];

export default function PaymentPage() {
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState("25000");
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href="/wallet">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour au portefeuille
            </Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Envoyer une récompense
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sécurisez le retour de votre objet avec une récompense.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`flex items-center gap-2 text-sm ${
                  i <= step ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Step 0 — Object details */}
        {step === 0 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Objet concerné</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium">iPhone 15 Pro Max — Noir Titane</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        Perdu dans le quartier Bastos, près du restaurant Le Cobac.
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Bastos, Yaoundé
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          15 Août 2025
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        Comment fonctionne la récompense ?
                      </p>
                      <p className="text-amber-600/80 dark:text-amber-500/70 mt-1">
                        Le montant est séquestré et versé au retrouveur uniquement
                        après confirmation du retour. Si l&apos;objet n&apos;est pas récupéré
                        sous 30 jours, vous êtes remboursé.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={() => setStep(1)} className="w-full" size="lg">
              Continuer
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 1 — Amount */}
        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Montant de la récompense</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="relative max-w-xs mx-auto">
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-center text-3xl font-bold h-16 pr-16"
                      min="1000"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      FCFA
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Montant minimum : 1 000 FCFA
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {["5000", "10000", "25000", "50000"].map((preset) => (
                    <Button
                      key={preset}
                      variant={amount === preset ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAmount(preset)}
                    >
                      {Number(preset).toLocaleString()}
                    </Button>
                  ))}
                </div>

                <div>
                  <Label className="text-sm">Note (optionnel)</Label>
                  <Input
                    placeholder="Merci de bien vouloir retourner mon téléphone..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <Button onClick={() => setStep(2)} className="flex-1" size="lg">
                Continuer
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — Payment method */}
        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Mode de paiement</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                          paymentMethod === method.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <RadioGroupItem value={method.id} />
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <method.icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{method.name}</p>
                          <p className="text-xs text-muted-foreground">{method.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {method.fees}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </RadioGroup>

                {paymentMethod === "mobile_money" && (
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-sm">Numéro Mobile Money</Label>
                    <Input
                      type="tel"
                      placeholder="+237 6XX XXX XXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1" size="lg">
                Continuer
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Confirmer le paiement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">Montant total</p>
                  <p className="text-4xl font-bold text-primary">
                    {Number(amount).toLocaleString()} FCFA
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {paymentMethods.find((m) => m.id === paymentMethod)?.name}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Objet</span>
                    <span className="font-medium">iPhone 15 Pro Max</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Récompense</span>
                    <span>{Number(amount).toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais</span>
                    <span>0 FCFA</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{Number(amount).toLocaleString()} FCFA</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm">
                  <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Votre paiement est sécurisé par notre système d&apos;escrow.
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <Button
                className="flex-1"
                size="lg"
                asChild
              >
                <Link href="/payment/success">
                  <Lock className="h-4 w-4 mr-2" />
                  Payer {Number(amount).toLocaleString()} FCFA
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
