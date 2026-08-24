"use client";

import Link from "next/link";
import { MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <MapPin className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">RetrouvIt</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login"><Button variant="ghost" size="sm">Connexion</Button></Link>
            <Link href="/auth/register"><Button size="sm">Commencer</Button></Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>

          <h1 className="text-3xl font-bold mb-8">Conditions d&apos;utilisation</h1>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">1. Acceptation</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  En utilisant RetrouvIt, vous acceptez ces conditions d&apos;utilisation.
                  Si vous n&apos;acceptez pas, veuillez ne pas utiliser notre plateforme.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">2. Compte utilisateur</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Vous êtes responsable de la sécurité de votre compte. Vous vous engagez
                  à fournir des informations exactes et à ne pas usurper l&apos;identité d&apos;autrui.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">3. Publications</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Vous vous engagez à publier des annonces sincères et exactes.
                  Les fausses annonces entraînent la suspension de votre compte.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">4. Paiements</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Les transactions sont sécurisées via notre système de séquestre.
                  Des frais de 2% s&apos;appliquent sur les récompenses et retraits.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">5. Responsabilité</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  RetrouvIt facilite les mises en relation mais ne garantit pas
                  la restitution des objets. Les utilisateurs sont responsables de
                  leurs interactions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
