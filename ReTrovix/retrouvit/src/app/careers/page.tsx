"use client";

import Link from "next/link";
import {
  Users,
  Heart,
  Zap,
  Globe,
  MapPin,
  Briefcase,
  Clock,
  ArrowRight,
  Coffee,
  Laptop,
  GraduationCap,
  TreePine,
  Wallet,
  Stethoscope,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const values = [
  {
    icon: Heart,
    title: "Impact social",
    description:
      "Chaque ligne de code que nous écrivons a pour objectif de rendre le monde un peu meilleur en aidant les gens à retrouver ce qui compte pour eux.",
  },
  {
    icon: Users,
    title: "Communauté d'abord",
    description:
      "Nous construisons pour notre communauté. Les retours de nos utilisateurs guident chaque décision produit.",
  },
  {
    icon: Zap,
    title: "Excellence technique",
    description:
      "Nous visons la qualité dans tout ce que nous faisons, de l'architecture backend à l'expérience utilisateur.",
  },
  {
    icon: Globe,
    title: "Diversité & inclusion",
    description:
      "Notre équipe reflète la diversité du monde. Chaque voix compte, chaque perspective enrichit notre produit.",
  },
];

const benefits = [
  { icon: Laptop, title: "Télétravail flexible", description: "Travaillez où vous voulez, quand vous voulez" },
  { icon: Wallet, title: "Rémunération compétitive", description: "Salaires au-dessus du marché + equity" },
  { icon: Stethoscope, title: "Mutuelle premium", description: "Remboursement à 100% pour vous et votre famille" },
  { icon: GraduationCap, title: "Formation continue", description: "Budget formation de 2 000€/an par personne" },
  { icon: Coffee, title: "Team buildings", description: "Événements mensuels et retraite annuelle" },
  { icon: TreePine, title: "Congés généreux", description: "25 jours de congés + RTT + jours perso" },
];

const departments = [
  "Tous",
  "Ingénierie",
  "Produit",
  "Design",
  "Marketing",
  "Opérations",
];

const positions = [
  {
    title: "Senior Full-Stack Engineer",
    department: "Ingénierie",
    type: "CDI",
    location: "Paris / Remote",
    description:
      "Rejoignez notre équipe technique pour construire les fonctionnalités qui aident des milliers de personnes à retrouver leurs objets perdus.",
    tags: ["React", "Next.js", "Node.js", "PostgreSQL"],
  },
  {
    title: "Product Designer (UI/UX)",
    department: "Design",
    type: "CDI",
    location: "Paris / Remote",
    description:
      "Concevez des expériences utilisateur intuitives et élégantes qui rendent le processus de retrouvaille simple et agréable.",
    tags: ["Figma", "Design System", "Prototyping", "User Research"],
  },
  {
    title: "Mobile Engineer (React Native)",
    department: "Ingénierie",
    type: "CDI",
    location: "Remote",
    description:
      "Développez et améliorez notre application mobile(iOS & Android) millions d'utilisateurs.",
    tags: ["React Native", "TypeScript", "Expo", "iOS/Android"],
  },
  {
    title: "Growth Marketing Manager",
    department: "Marketing",
    type: "CDI",
    location: "Paris",
    description:
      "Définissez et exécutez notre stratégie d'acquisition pour atteindre 1 million d'utilisateurs d'ici fin 2026.",
    tags: ["SEO", "Content", "Paid Acquisition", "Analytics"],
  },
  {
    title: "Product Manager",
    department: "Produit",
    type: "CDI",
    location: "Paris / Remote",
    description:
      "Pilotez le roadmap produit et travaillez avec les équités techniques et design pour livrer de la valeur à nos utilisateurs.",
    tags: ["Roadmap", "Analytics", "User Research", "Agile"],
  },
  {
    title: "Backend Engineer (Node.js / Go)",
    department: "Ingénierie",
    type: "CDI",
    location: "Remote",
    description:
      "Concevez et implémentez les APIs backend qui font tourner RetrouvIt, avec focus sur la performance et la fiabilité.",
    tags: ["Node.js", "Go", "PostgreSQL", "Redis"],
  },
  {
    title: "Customer Success Manager",
    department: "Opérations",
    type: "CDI",
    location: "Paris",
    description:
      "Accompagnez nos utilisateurs premium et partenaires pour maximiser leur satisfaction et fidélisation.",
    tags: ["Support", "CRM", "Onboarding", "Relation client"],
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-background/50 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="w-3 h-3 mr-1.5" />
              Nous recrutons
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Rejoignez-nous pour{" "}
              <span className="text-primary">changer des vies</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Nous construisons la plateforme de retrouvailles la plus
              importante au monde. Team de 40 personnes, Series A levée,
              on a besoin de vous.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button size="lg" asChild>
                <a href="#positions">
                  Voir les postes ouverts
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/about">Notre histoire</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "40+", label: "Collaborateurs" },
              { value: "12", label: "Nationalités" },
              { value: "4.8/5", label: "Note Glassdoor" },
              { value: "92%", label: "Taux de rétention" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Nos valeurs</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Ce qui nous anime au quotidien et guide chacune de nos décisions.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="text-center">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Ce qu&apos;on vous offre</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Parce que les meilleurs résultats viennent de gens épanouis.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="flex items-start gap-4 p-4 rounded-lg bg-background border"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{benefit.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open positions */}
      <section id="positions" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Postes ouverts</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {positions.length} postes disponibles. Trouvez celui qui vous
              correspond.
            </p>
          </div>

          {/* Department filters */}
          <div className="flex items-center gap-2 justify-center mb-8 flex-wrap">
            {departments.map((dept) => (
              <Badge
                key={dept}
                variant={dept === "Tous" ? "default" : "outline"}
                className="cursor-pointer"
              >
                {dept}
              </Badge>
            ))}
          </div>

          {/* Position cards */}
          <div className="max-w-3xl mx-auto space-y-4">
            {positions.map((pos, i) => (
              <Card
                key={i}
                className="group hover:shadow-md transition-all cursor-pointer"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {pos.title}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {pos.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {pos.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          {pos.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {pos.location}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {pos.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Vous ne trouvez pas votre poste ?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Envoyez-nous votre candidature spontanée. Nous sommes toujours
            à la recherche de talents exceptionnels.
          </p>
          <Button size="lg" asChild>
            <Link href="/contact">
              Candidater spontanément
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
