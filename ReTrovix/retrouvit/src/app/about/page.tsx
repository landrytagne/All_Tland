"use client";

import Link from "next/link";
import { MapPin, Users, Shield, Heart, ArrowRight, Target, Eye, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <MapPin className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">RetrouvIt</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Connexion</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">Commencer</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <Badge variant="outline" className="mb-4">À propos</Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Notre mission
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              RetrouvIt est née d&apos;une simple observation : trop d&apos;objets perdus ne
              sont jamais retrouvés, et trop de trouveurs ne savent pas comment les
              restituer. Nous changeons ça.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-8 md:grid-cols-3">
              {[
                { icon: Target, title: "Notre mission", description: "Réduire le nombre d'objets perdus et créer une communauté solidaire au Cameroun." },
                { icon: Eye, title: "Notre vision", description: "Devenir la plateforme de référence en Afrique pour la restitution d'objets perdus." },
                { icon: Globe, title: "Notre impact", description: "Plus de 12 500 objets déjà retrouvés et 45 000 utilisateurs actifs." },
              ].map((value) => (
                <Card key={value.title}>
                  <CardContent className="p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                      <value.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">L&apos;équipe</h2>
            <p className="text-muted-foreground mb-8">
              Une équipe passionnée dédiée à reconnecter les gens avec ce qui compte le plus.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {["Landry Tagne", "Marie Ngono", "Paul Fouda", "Sophie Biya"].map((name) => (
                <div key={name}>
                  <div className="h-20 w-20 rounded-full bg-muted mx-auto mb-2" />
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">Co-fondateur</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
