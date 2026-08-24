"use client";

import Link from "next/link";
import { MapPin, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Gratuit",
    price: "0",
    period: "/mois",
    description: "Pour commencer à retrouver vos objets",
    features: [
      "Publications d'annonces illimitées",
      "Recherche et filtres avancés",
      "Messagerie sécurisée",
      "Correspondances automatiques",
      "Support par email",
    ],
    cta: "Commencer gratuitement",
    popular: false,
  },
  {
    name: "Premium",
    price: "5 000",
    period: " FCFA/mois",
    description: "Pour les utilisateurs actifs",
    features: [
      "Tout du plan Gratuit",
      "Annonces mises en avant",
      "Notifications prioritaires",
      "Statistiques détaillées",
      "Support prioritaire",
      "Badge vérifié premium",
    ],
    cta: "Passer à Premium",
    popular: true,
  },
  {
    name: "Entreprise",
    price: "25 000",
    period: " FCFA/mois",
    description: "Pour les entreprises et organisations",
    features: [
      "Tout du plan Premium",
      "API d'intégration",
      "Tableau de bord analytics",
      "Gestion multi-utilisateurs",
      "Support dédié 24/7",
      "Personnalisation de marque",
    ],
    cta: "Contacter l'équipe",
    popular: false,
  },
];

export default function PricingPage() {
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

      <main className="flex-1">
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-3">Tarifs</Badge>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Des tarifs simples et transparents
              </h1>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Commencez gratuitement, évoluez quand vous en avez besoin.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.name} className={cn(plan.popular && "border-primary shadow-md relative")}>
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                      <Star className="h-3 w-3" /> Populaire
                    </Badge>
                  )}
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                    <Button className="w-full mt-4" variant={plan.popular ? "default" : "outline"}>
                      {plan.cta}
                    </Button>
                    <ul className="mt-6 space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
