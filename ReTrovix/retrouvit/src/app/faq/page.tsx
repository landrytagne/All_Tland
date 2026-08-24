"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Comment fonctionne RetrouvIt ?",
    answer: "RetrouvIt connecte les personnes qui ont perdu des objets avec celles qui les ont trouvés. Vous publiez une annonce décrivant votre objet, et notre algorithme recherche automatiquement des correspondances parmi les objets trouvés.",
  },
  {
    question: "Comment créer une annonce ?",
    answer: "Cliquez sur 'Publier', choisissez si l'objet est perdu ou trouvé, remplissez les détails (description, catégorie, lieu, date), ajoutez des photos et publiez. C'est gratuit !",
  },
  {
    question: "Comment fonctionne le système de récompenses ?",
    answer: "Lorsque vous perdez un objet, vous pouvez proposer une récompense. Le montant est sécurisé via notre système de séquestre. Une fois l'objet récupéré et vérifié, la récompense est versée au trouveur.",
  },
  {
    question: "Le service est-il gratuit ?",
    answer: "La publication d'annonces et la recherche sont entièrement gratuites. Des frais de 2% s'appliquent uniquement sur les transactions de récompenses et les retraits.",
  },
  {
    question: "Comment fonctionne le système de séquestre ?",
    answer: "Le paiement est bloqué dans notre système sécurisé le temps que l'objet soit vérifié et récupéré. Cela protège tant le propriétaire que le trouveur.",
  },
  {
    question: "Comment signaler une fraude ?",
    answer: "Utilisez le bouton 'Signaler' sur n'importe quelle annonce ou contactez notre support. Toute activité suspecte est enquêtée et les comptes fraudulent sont bannis.",
  },
  {
    question: "Dans quelles villes est disponible RetrouvIt ?",
    answer: "RetrouvIt est disponible dans toutes les grandes villes du Cameroun : Yaoundé, Douala, Bafoussam, Bamenda, Garoua, Maroua, Ngaoundéré, Bertoua, Ebolowa et Kribi.",
  },
  {
    question: "Comment augmenter mon score de confiance ?",
    answer: "Votre score augmente avec : des retours d'objets réussis, des avis positifs, un profil vérifié, et une activité régulière sur la plateforme.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

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
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-3">FAQ</Badge>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Questions fréquentes
              </h1>
              <p className="mt-3 text-muted-foreground">
                Tout ce que vous devez savoir sur RetrouvIt.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold pr-4">{faq.question}</h3>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                          openIndex === index && "rotate-180"
                        )}
                      />
                    </div>
                    {openIndex === index && (
                      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                        {faq.answer}
                      </p>
                    )}
                  </button>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
