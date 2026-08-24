"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Smartphone,
  Key,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Download,
  Trash2,
  Plus,
  Clock,
  Monitor,
  Globe,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const backupCodes = [
  "A7K2-M9P4", "B3L8-Q5R1", "C6N0-S2T7",
  "D1P5-U8V3", "E4R9-W6X2", "F8T1-Y3Z5",
];

const activeSessions = [
  {
    id: "s1",
    device: "iPhone 15 Pro",
    browser: "Safari",
    os: "iOS 18.1",
    location: "Yaoundé, Cameroun",
    ip: "197.157.xxx.xxx",
    lastActive: "Maintenant",
    current: true,
  },
  {
    id: "s2",
    device: "MacBook Pro",
    browser: "Chrome 128",
    os: "macOS Sequoia",
    location: "Yaoundé, Cameroun",
    ip: "197.157.xxx.xxx",
    lastActive: "Il y a 2 heures",
    current: false,
  },
  {
    id: "s3",
    device: "Samsung Galaxy S24",
    browser: "Chrome Mobile",
    os: "Android 14",
    location: "Douala, Cameroun",
    ip: "41.89.xxx.xxx",
    lastActive: "Il y a 3 jours",
    current: false,
  },
];

export default function TwoFactorSettingsPage() {
  const [isEnabled, setIsEnabled] = React.useState(false);
  const [showSetup, setShowSetup] = React.useState(false);
  const [setupStep, setSetupStep] = React.useState<"scan" | "verify" | "backup">("scan");
  const [copied, setCopied] = React.useState<string | null>(null);
  const [codesCopied, setCodesCopied] = React.useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyAllCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCodesCopied(true);
    setTimeout(() => setCodesCopied(false), 2000);
  };

  return (
    <MainLayout showFooter={false}>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux paramètres
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Authentification à deux facteurs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez une couche de sécurité supplémentaire à votre compte.
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  isEnabled
                    ? "bg-emerald-50 dark:bg-emerald-950/30"
                    : "bg-muted"
                )}>
                  <Shield className={cn(
                    "h-6 w-6",
                    isEnabled ? "text-emerald-500" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      2FA par SMS
                    </h3>
                    <Badge variant={isEnabled ? "success" : "secondary"}>
                      {isEnabled ? "Activé" : "Désactivé"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isEnabled
                      ? "Un code est envoyé par SMS à chaque connexion."
                      : "Protégez votre compte avec un second facteur."}
                  </p>
                </div>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setShowSetup(true);
                  } else {
                    setIsEnabled(false);
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Setup Flow */}
        {showSetup && !isEnabled && (
          <Card className="mb-6">
            <CardContent className="p-6 space-y-6">
              {/* Step: Scan QR */}
              {setupStep === "scan" && (
                <>
                  <div className="text-center">
                    <h3 className="font-semibold mb-1">Étape 1 : Enregistrez votre numéro</h3>
                    <p className="text-sm text-muted-foreground">
                      Entrez le numéro de téléphone où recevoir les codes.
                    </p>
                  </div>
                  <div className="space-y-3 max-w-sm mx-auto">
                    <div className="space-y-2">
                      <Label>Numéro de téléphone</Label>
                      <Input type="tel" placeholder="+237 6XX XXX XXX" />
                    </div>
                    <Button className="w-full" onClick={() => setSetupStep("verify")}>
                      Envoyer le code de vérification
                    </Button>
                  </div>
                </>
              )}

              {/* Step: Verify Code */}
              {setupStep === "verify" && (
                <>
                  <div className="text-center">
                    <h3 className="font-semibold mb-1">Étape 2 : Vérifiez votre numéro</h3>
                    <p className="text-sm text-muted-foreground">
                      Entrez le code à 6 chiffres envoyé par SMS.
                    </p>
                  </div>
                  <div className="space-y-3 max-w-sm mx-auto">
                    <div className="flex justify-center gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Input
                          key={i}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          className="h-12 w-12 text-center text-lg font-semibold"
                        />
                      ))}
                    </div>
                    <Button className="w-full" onClick={() => setSetupStep("backup")}>
                      Vérifier le code
                    </Button>
                    <Button variant="ghost" className="w-full" size="sm">
                      Renvoyer le code
                    </Button>
                  </div>
                </>
              )}

              {/* Step: Backup Codes */}
              {setupStep === "backup" && (
                <>
                  <div className="text-center">
                    <h3 className="font-semibold mb-1">Étape 3 : Codes de secours</h3>
                    <p className="text-sm text-muted-foreground">
                      Sauvegardez ces codes. Vous pourrez les utiliser si vous perdez l&apos;accès à votre téléphone.
                    </p>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      Chaque code ne peut être utilisé qu&apos;une seule fois. Conservez-les dans un endroit sûr.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {backupCodes.map((code) => (
                      <div
                        key={code}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted font-mono text-sm"
                      >
                        <span>{code}</span>
                        <button
                          onClick={() => handleCopyCode(code)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copied === code ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-1" onClick={handleCopyAllCodes}>
                      {codesCopied ? (
                        <><Check className="h-3 w-3" /> Copié !</>
                      ) : (
                        <><Copy className="h-3 w-3" /> Tout copier</>
                      )}
                    </Button>
                    <Button variant="outline" className="flex-1 gap-1">
                      <Download className="h-3 w-3" /> Télécharger
                    </Button>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => {
                      setIsEnabled(true);
                      setShowSetup(false);
                    }}
                  >
                    Activer la 2FA
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowSetup(false)}
              >
                Annuler
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Backup Codes Management (when enabled) */}
        {isEnabled && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="h-4 w-4" />
                Codes de secours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Vous avez 6 codes de secours. Chaque code ne peut être utilisé qu&apos;une seule fois.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-3 w-3" /> Télécharger
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <RefreshCw className="h-3 w-3" /> Régénérer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Sessions */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Sessions actives
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-destructive gap-1">
                <Trash2 className="h-3 w-3" /> Tout déconnecter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  session.current && "bg-muted/30"
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {session.device.includes("iPhone") || session.device.includes("Samsung") ? (
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Monitor className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{session.device}</p>
                    {session.current && (
                      <Badge variant="success" className="text-[10px]">Actuelle</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {session.browser} · {session.os}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {session.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {session.lastActive}
                    </span>
                  </div>
                </div>
                {!session.current && (
                  <Button variant="ghost" size="sm" className="text-destructive shrink-0">
                    Déconnecter
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Security Tips */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Conseils de sécurité
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Utilisez un mot de passe unique et complexe</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Activez l&apos;authentification à deux facteurs</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Ne partagez jamais vos codes de vérification</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Déconnectez les appareils que vous n&apos;utilisez plus</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
