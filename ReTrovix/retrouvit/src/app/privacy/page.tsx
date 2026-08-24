"use client";

import Link from "next/link";
import { MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPage() {
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

          <h1 className="text-3xl font-bold mb-8">Politique de confidentialité</h1>

          <div className="prose prose-sm max-w-none space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">1. Collecte des données</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Nous collectons les informations que vous nous fournissez lors de l&apos;inscription :
                  nom, email, téléphone, localisation. Nous collectons également les données
                  de navigation pour améliorer notre service.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">2. Utilisation des données</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Vos données sont utilisées pour : faciliter les correspondances entre objets
                  perdus et trouvés, sécuriser les transactions, et améliorer l&apos;expérience
                  utilisateur. Nous ne vendons jamais vos données à des tiers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">3. Sécurité</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Nous employons des mesures de sécurité avancées pour protéger vos données :
                  chiffrement SSL, authentification à deux facteurs, et surveillance continue.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">4. Vos droits</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Vous disposez des droits suivants : accès à vos données, rectification,
                  suppression, et portabilité. Contactez-nous pour exercer ces droits.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
