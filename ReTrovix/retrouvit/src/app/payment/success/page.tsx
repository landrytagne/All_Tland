"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  Download,
  Share2,
  Shield,
  Clock,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function PaymentSuccessPage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 text-center">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>

          <h1 className="text-2xl font-bold mb-2">Paiement effectué !</h1>
          <p className="text-muted-foreground mb-8">
            Votre récompense a été séquestrée avec succès.
          </p>

          <Card className="mb-6 text-left">
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-semibold text-lg">25 000 FCFA</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Objet</span>
                <span>iPhone 15 Pro Max</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Référence</span>
                <span className="font-mono">ESC-2025-08-192</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Statut</span>
                <Badge variant="warning">Séquestré</Badge>
              </div>
              <Separator />
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm">
                <Shield className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-blue-700 dark:text-blue-400">
                  Les fonds sont en sécurité. Ils seront versés au retrouveur
                  uniquement après confirmation du retour de l&apos;objet.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
            <Clock className="h-4 w-4" />
            <span>Remboursement automatique si non récupéré sous 30 jours</span>
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link href="/messages">
                <Share2 className="h-4 w-4 mr-2" />
                Contacter
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">
                Retour au tableau de bord
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
