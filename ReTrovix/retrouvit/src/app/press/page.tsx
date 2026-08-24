"use client";

import {
  Download,
  ExternalLink,
  Mail,
  Newspaper,
  Camera,
  FileText,
  ArrowRight,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const pressReleases = [
  {
    date: "10 Juillet 2025",
    title: "RetrouvIt lève 12 millions en Série A pour accélérer son expansion européenne",
    source: "Les Échos",
    summary:
      "La startup française spécialisée dans le matching d'objets perdus et trouvés annonce une levée de fonds de 12 millions d'euros menée par Accel, avec la participation de Seedcamp et de business angels.",
    tag: "Financement",
  },
  {
    date: "15 Mai 2025",
    title: "RetrouvIt franchit le cap des 500 000 utilisateurs en France",
    source: "TechCrunch",
    summary:
      "En seulement 18 mois d'existence, la plateforme de retrouvailles atteint un demi-million d'utilisateurs actifs, avec plus de 120 000 objets retrouvés à ce jour.",
    tag: "Croissance",
  },
  {
    date: "20 Mars 2025",
    title: "RetrouvIt et la SNCF s'associent pour retrouver les effets personnels perdus en gare",
    source: "Le Monde",
    summary:
      "Un partenariat historique qui permettra aux 4 millions de voyageurs quotidiens de la SNCF de signaler et rechercher directement sur RetrouvIt les objets perdus en gare ou à bord des trains.",
    tag: "Partenariat",
  },
  {
    date: "5 Janvier 2025",
    title: "RetrouvIt lance le programme « Écoles sans perte »",
    source: "BFM Business",
    summary:
      "Un programme dédié aux établissements scolaires pour aider les élèves et parents à retrouver les effets personnels oubliés à l'école, avec un module dédié pour les CPE.",
    tag: "Lancement",
  },
  {
    date: "12 Novembre 2024",
    title: "Prix de l'innovation sociale 2024 : RetrouvIt lauréat",
    source: "France Info",
    summary:
      "RetrouvIt reçoit le Prix de l'Innovation Sociale décerné par le Ministère de la Transition Numérique pour son impact positif sur la vie quotidienne des Français.",
    tag: "Prix",
  },
];

const pressMentions = [
  { name: "Les Échos", logo: "LE" },
  { name: "TechCrunch", logo: "TC" },
  { name: "Le Monde", logo: "LM" },
  { name: "BFM Business", logo: "BF" },
  { name: "France Info", logo: "FI" },
  { name: "Forbes France", logo: "FF" },
  { name: "L'Express", logo: "LEX" },
  { name: "Challenges", logo: "CH" },
];

const mediaKit = [
  {
    icon: FileText,
    title: "Fiche entreprise",
    description: "Présentation complète de RetrouvIt en 2 pages",
    format: "PDF · 1.2 MB",
  },
  {
    icon: Camera,
    title: "Pack photos HD",
    description: "Screenshots de l'app, photos d'équipe, bureaux",
    format: "ZIP · 15 MB",
  },
  {
    icon: FileText,
    title: "Logos & branding",
    description: "Logo principal, variantes, guidelines couleur",
    format: "ZIP · 8 MB",
  },
  {
    icon: Newspaper,
    title: "Communiqués de presse",
    description: "Tous nos communiqués depuis le lancement",
    format: "PDF · 3.5 MB",
  },
];

const quotes = [
  {
    text: "RetrouvIt résout un problème que tout le monde a déjà rencontré. C'est exactement le type de produit tech à fort impact que nous cherchons à soutenir.",
    author: "Sarah El Kaïm",
    role: "Partner, Accel",
  },
  {
    text: "Une idée simple mais brillante, exécutée avec excellence. RetrouvIt est en passe de devenir l'acteur incontournable des retrouvailles en France.",
    author: "Thomas Plantureux",
    role: "Rédacteur en chef, TechCrunch France",
  },
];

export default function PressPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-background/50 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,hsl(var(--primary)/0.06),transparent_50%)]" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Newspaper className="w-3 h-3 mr-1.5" />
              Espace presse
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              RetrouvIt dans la{" "}
              <span className="text-primary">presse</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Découvrez notre actualité, téléchargez nos ressources médiatiques
              et contactez notre équipe communication.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button size="lg" asChild>
                <a href="#releases">
                  Derniers communiqués
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#media-kit">
                  <Download className="w-4 h-4 mr-2" />
                  Kit média
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Press mentions */}
      <section className="border-y py-12">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Ils ont parlé de nous
          </p>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-6 items-center justify-items-center">
            {pressMentions.map((m) => (
              <div
                key={m.name}
                className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center font-bold text-sm text-muted-foreground"
                title={m.name}
              >
                {m.logo}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Press releases */}
      <section id="releases" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Communiqués de presse
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {pressReleases.map((release, i) => (
              <Card
                key={i}
                className="group hover:shadow-md transition-all cursor-pointer"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {release.tag}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {release.date}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          via <strong>{release.source}</strong>
                        </span>
                      </div>
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                        {release.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {release.summary}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Quotes */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Ce qu&apos;ils disent de nous
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {quotes.map((q, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Quote className="w-8 h-8 text-primary/20 mb-3" />
                  <p className="text-sm italic mb-4 leading-relaxed">
                    &ldquo;{q.text}&rdquo;
                  </p>
                  <Separator className="mb-3" />
                  <div>
                    <p className="font-semibold text-sm">{q.author}</p>
                    <p className="text-xs text-muted-foreground">{q.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Media Kit */}
      <section id="media-kit" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4 text-center">Kit média</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Téléchargez nos ressources pour vos articles et reportages.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {mediaKit.map((item) => (
              <Card
                key={item.title}
                className="group hover:shadow-md transition-all cursor-pointer"
              >
                <CardContent className="p-5 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    {item.description}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    {item.format}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Contact presse</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Pour toute demande d&apos;interview, d&apos;information ou de
            partenariat médiatique, contactez notre équipe communication.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button size="lg" asChild>
              <a href="mailto:press@retrouvit.com">
                <Mail className="w-4 h-4 mr-2" />
                press@retrouvit.com
              </a>
            </Button>
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Marie Dupont</strong> — Directrice Communication
              </p>
              <p>+33 1 23 45 67 89</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
