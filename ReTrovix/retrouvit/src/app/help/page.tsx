"use client";

import * as React from "react";
import Link from "next/link";
import {
  MapPin,
  Search,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  BookOpen,
  Shield,
  CreditCard,
  User,
  Package,
  HelpCircle,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const categories = [
  { id: "getting-started", label: "Pour commencer", icon: BookOpen, count: 8 },
  { id: "account", label: "Mon compte", icon: User, count: 12 },
  { id: "objects", label: "Objets", icon: Package, count: 15 },
  { id: "payments", label: "Paiements", icon: CreditCard, count: 6 },
  { id: "security", label: "Sécurité", icon: Shield, count: 9 },
  { id: "other", label: "Autres", icon: HelpCircle, count: 5 },
];

const popularArticles = [
  {
    id: "a1",
    title: "Comment créer une annonce d'objet perdu ?",
    category: "Pour commencer",
    readTime: "3 min",
    views: 2340,
  },
  {
    id: "a2",
    title: "Comment fonctionne le système de séquestre ?",
    category: "Paiements",
    readTime: "5 min",
    views: 1890,
  },
  {
    id: "a3",
    title: "Comment augmenter son score de confiance ?",
    category: "Mon compte",
    readTime: "4 min",
    views: 1560,
  },
  {
    id: "a4",
    title: "Comment signaler une fraude ?",
    category: "Sécurité",
    readTime: "2 min",
    views: 1230,
  },
];

const recentArticles = [
  {
    id: "a5",
    title: "Comment modifier mon annonce après publication ?",
    category: "Objets",
    date: "2025-08-18",
  },
  {
    id: "a6",
    title: "Que faire si je reçois un message suspect ?",
    category: "Sécurité",
    date: "2025-08-17",
  },
  {
    id: "a7",
    title: "Comment retirer mes fonds du portefeuille ?",
    category: "Paiements",
    date: "2025-08-16",
  },
  {
    id: "a8",
    title: "Comment supprimer mon compte ?",
    category: "Mon compte",
    date: "2025-08-15",
  },
  {
    id: "a9",
    title: "Comment ajouter une récompense à mon annonce ?",
    category: "Objets",
    date: "2025-08-14",
  },
];

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedArticle, setExpandedArticle] = React.useState<string | null>(null);

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-3">Centre d&apos;aide</Badge>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Parcourez notre base de connaissances ou contactez notre équipe support.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mx-auto mb-10">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans l'aide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base"
          />
        </div>

        {/* Categories */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border bg-background hover:shadow-md hover:border-primary/20 transition-all text-left"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <cat.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{cat.label}</p>
                <p className="text-xs text-muted-foreground">{cat.count} articles</p>
              </div>
            </button>
          ))}
        </div>

        {/* Popular Articles */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Articles populaires</h2>
          <div className="space-y-2">
            {popularArticles
              .filter(
                (a) =>
                  a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.category.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((article) => (
                <button
                  key={article.id}
                  onClick={() =>
                    setExpandedArticle(expandedArticle === article.id ? null : article.id)
                  }
                  className="w-full text-left"
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-[10px]">
                              {article.category}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {article.readTime} de lecture
                            </span>
                          </div>
                          <h3 className="text-sm font-medium">{article.title}</h3>
                          {expandedArticle === article.id && (
                            <div className="mt-3 text-sm text-muted-foreground leading-relaxed border-t pt-3">
                              <p>
                                RetrouvIt facilite la publication d&apos;annonces d&apos;objets
                                perdus et trouvés. Voici les étapes détaillées :
                              </p>
                              <ol className="list-decimal list-inside mt-2 space-y-1">
                                <li>Connectez-vous à votre compte RetrouvIt</li>
                                <li>Cliquez sur &quot;Publier un objet&quot; dans la navbar</li>
                                <li>Choisissez le type : objet perdu ou trouvé</li>
                                <li>Remplissez les informations (titre, catégorie, description)</li>
                                <li>Ajoutez des photos de l&apos;objet</li>
                                <li>Indiquez la localisation et la date</li>
                                <li>Optionnellement, proposez une récompense</li>
                                <li>Publiez votre annonce</li>
                              </ol>
                              <p className="mt-2">
                                Votre annonce sera visible immédiatement et notre algorithme
                                cherchera automatiquement des correspondances.
                              </p>
                            </div>
                          )}
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                            expandedArticle === article.id && "rotate-180"
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
          </div>
        </div>

        {/* Recent Articles */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Articles récents</h2>
          <div className="space-y-1">
            {recentArticles
              .filter(
                (a) =>
                  a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.category.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((article) => (
                <button
                  key={article.id}
                  onClick={() =>
                    setExpandedArticle(expandedArticle === article.id ? null : article.id)
                  }
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                    <div>
                      <p className="text-sm font-medium">{article.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {article.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {article.date}
                        </span>
                      </div>
                      {expandedArticle === article.id && (
                        <div className="mt-3 text-sm text-muted-foreground leading-relaxed border-t pt-3">
                          <p>
                            Consultez notre documentation pour plus de détails sur ce sujet.
                            Notre équipe support est disponible 7j/7 pour vous accompagner.
                          </p>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* Contact Support */}
        <Card className="bg-muted/30">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold">Besoin d&apos;aide ?</h3>
              <p className="text-sm text-muted-foreground">
                Notre équipe support vous répond en moins de 24h.
              </p>
            </div>
            <Button asChild>
              <Link href="/contact" className="gap-2">
                Nous contacter
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
