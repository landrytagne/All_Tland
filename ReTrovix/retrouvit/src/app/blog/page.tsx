"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Search,
  Clock,
  ArrowRight,
  TrendingUp,
  Tag,
  User,
  BookOpen,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const categories = [
  { name: "Tous", count: 24 },
  { name: "Conseils", count: 8 },
  { name: "Sécurité", count: 6 },
  { name: "Témoignages", count: 5 },
  { name: "Actualités", count: 3 },
  { name: "Guide", count: 2 },
];

const featuredPost = {
  title: "Comment RetrouvIt a aidé 10 000 personnes à récupérer leurs objets en 2025",
  excerpt:
    "Découvrez les chiffres clés de notre année et les histoires qui nous ont le plus marqués. De Paris à Marseille, des milliers d'utilisateurs ont retrouvé ce qui comptait pour eux.",
  author: "Marie Dupont",
  date: "15 Août 2025",
  readTime: "8 min",
  category: "Actualités",
  image: "bg-gradient-to-br from-blue-500 to-indigo-600",
};

const posts = [
  {
    title: "5 gestes essentiels quand vous perdez votre téléphone",
    excerpt:
      "Perdre son smartphone est stressant. Voici les premières choses à faire immédiatement pour maximiser vos chances de le retrouver.",
    author: "Thomas Leroy",
    date: "12 Août 2025",
    readTime: "5 min",
    category: "Conseils",
    image: "bg-gradient-to-br from-amber-400 to-orange-500",
  },
  {
    title: "Le score de confiance : comment ça fonctionne ?",
    excerpt:
      "Explication détaillée de notre algorithme de score de confiance et comment il protège notre communauté contre les abus.",
    author: "Sophie Martin",
    date: "10 Août 2025",
    readTime: "7 min",
    category: "Sécurité",
    image: "bg-gradient-to-br from-emerald-400 to-teal-500",
  },
  {
    title: "« J'ai retrouvé mon album de famille grâce à RetrouvIt »",
    excerpt:
      "Le témoignage émouvant de Claire, qui avait perdu un album photos contenant 30 ans de souvenirs de famille lors de son déménagement.",
    author: "Claire Beaumont",
    date: "8 Août 2025",
    readTime: "4 min",
    category: "Témoignages",
    image: "bg-gradient-to-br from-pink-400 to-rose-500",
  },
  {
    title: "Guide complet : sécuriser ses affaires lors d'un voyage",
    excerpt:
      "Nos meilleurs conseils pour éviter de perdre vos affaires en déplacement et savoir quoi faire si ça arrive malgré tout.",
    author: "Marc Dubois",
    date: "5 Août 2025",
    readTime: "6 min",
    category: "Guide",
    image: "bg-gradient-to-br from-violet-400 to-purple-500",
  },
  {
    title: "Nouveau : alertes en temps réel pour les objets相似 à votre recherche",
    excerpt:
      "Découvrez notre nouvelle fonctionnalité qui vous notifie instantanément quand un objet correspond à votre recherche est trouvé.",
    author: "Jean-Pierre Moreau",
    date: "3 Août 2025",
    readTime: "3 min",
    category: "Actualités",
    image: "bg-gradient-to-br from-cyan-400 to-blue-500",
  },
  {
    title: "Comment protéger ses données personnelles sur les plateformes en ligne",
    excerpt:
      "Un guide pratique pour sécuriser votre vie numérique et éviter les pièges des arnaques en ligne sur les plateformes de retrouvailles.",
    author: "Antoine Leclerc",
    date: "1 Août 2025",
    readTime: "6 min",
    category: "Sécurité",
    image: "bg-gradient-to-br from-red-400 to-rose-500",
  },
];

const popularTags = [
  "Perdu & retrouvé",
  "Sécurité",
  "Téléphone",
  "Animaux",
  "Voyage",
  "Valeurs",
  "Déménagement",
  "Conseils",
];

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = posts.filter((post) => {
    const matchesCategory =
      selectedCategory === "Tous" || post.category === selectedCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-background/50 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.05),transparent_50%)]" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-2xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <BookOpen className="w-3 h-3 mr-1.5" />
              Blog RetrouvIt
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Stories, conseils &{" "}
              <span className="text-primary">actualités</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Retrouvez nos derniers articles, guides pratiques et témoignages
              de notre communauté.
            </p>
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un article..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-[1fr_280px] gap-12">
          {/* Main content */}
          <div>
            {/* Featured post */}
            <Card className="mb-8 overflow-hidden">
              <div className={`h-48 md:h-64 ${featuredPost.image}`} />
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant="default">{featuredPost.category}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> À la une
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold mb-2">
                  {featuredPost.title}
                </h2>
                <p className="text-muted-foreground mb-4 line-clamp-2">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {featuredPost.author}
                    </span>
                    <span>·</span>
                    <span>{featuredPost.date}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {featuredPost.readTime}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/blog/comment-retrouvit-a-aide">
                      Lire
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Post grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {filteredPosts.map((post, i) => (
                <Card key={i} className="overflow-hidden group hover:shadow-lg transition-all">
                  <div className={`h-40 ${post.image}`} />
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {post.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>
                    <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      <Link href={`/blog/${post.title.toLowerCase().replace(/ /g, "-")}`}>
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                      {post.author}
                      <span>·</span>
                      <Calendar className="w-3.5 h-3.5" />
                      {post.date}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-16">
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Aucun article trouvé
                </h3>
                <p className="text-muted-foreground">
                  Essayez avec d&apos;autres mots-clés ou changez de catégorie.
                </p>
              </div>
            )}

            {/* Load more */}
            {filteredPosts.length > 0 && (
              <div className="text-center mt-8">
                <Button variant="outline" size="lg">
                  Charger plus d&apos;articles
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Categories */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Catégories
                </h3>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCategory === cat.name
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <span>{cat.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {cat.count}
                      </Badge>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Popular tags */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Tags populaires</h3>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-primary/10">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Newsletter */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">📬 Newsletter</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Recevez nos meilleurs articles chaque semaine.
                </p>
                <Input placeholder="Votre email" className="mb-2" />
                <Button className="w-full" size="sm">
                  S&apos;inscrire
                </Button>
              </CardContent>
            </Card>

            {/* Recent */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Articles récents</h3>
                <div className="space-y-3">
                  {posts.slice(0, 3).map((post, i) => (
                    <div key={i} className="group cursor-pointer">
                      <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {post.date} · {post.readTime}
                      </p>
                      {i < 2 && <Separator className="mt-3" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
