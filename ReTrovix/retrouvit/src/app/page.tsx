"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  MapPin,
  Shield,
  ArrowRight,
  Star,
  Users,
  Package,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Zap,
  Heart,
  Globe,
  Menu,
  X,
  Smartphone,
  FileText,
  Key,
  Briefcase,
  CheckCircle2,
  Phone,
  MessageCircle,
  Wallet,
  Bell,
  ArrowUpRight,
  PawPrint,
  Car,
  Shirt,
  Gem,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LazyVideo } from "@/components/lazy-video";
import { VideoModal } from "@/components/video-modal";

// ─── Data ──────────────────────────────────────────────────────────

const getStats = (t: (key: string) => string) => [
  { label: t("landing.statsObjects"), value: "12 500+", icon: Package, color: "text-orange-brand" },
  { label: t("landing.statsUsers"), value: "45 000+", icon: Users, color: "text-forest dark:text-forest-light" },
  { label: t("landing.statsRate"), value: "87%", icon: TrendingUp, color: "text-orange-brand" },
  { label: t("landing.statsCities"), value: "10+", icon: Globe, color: "text-forest dark:text-forest-light" },
];

const steps = [
  {
    step: "01",
    title: "Déclarez votre objet",
    description: "Publiez une annonce détaillée avec photos, lieu et date de la perte ou découverte.",
    icon: Package,
    color: "bg-orange-brand",
  },
  {
    step: "02",
    title: "Notre algorithme matche",
    description: "Notre système compare automatiquement les annonces pour trouver des correspondances.",
    icon: Zap,
    color: "bg-forest dark:bg-forest-light",
  },
  {
    step: "03",
    title: "Contactez et récupérez",
    description: "Échangez en toute sécurité via notre messagerie intégrée et récupérez votre bien.",
    icon: Heart,
    color: "bg-orange-brand",
  },
];

const testimonials = [
  {
    name: "Amina Djoumessi",
    location: "Yaoundé",
    text: "J'ai retrouvé mon portefeuille avec tous mes documents grâce à RetrouvIt en seulement 2 jours ! Un service incroyable.",
    rating: 5,
    avatar: "AD",
  },
  {
    name: "Patrick Mbarga",
    location: "Douala",
    text: "Mon sac à dos contenant mon ordinateur a été trouvé et retourné. La récompense a bien été versée via le système séquestre.",
    rating: 5,
    avatar: "PM",
  },
  {
    name: "Carine Ngoune",
    location: "Bafoussam",
    text: "Interface simple et efficace. J'ai pu retrouver les clés de ma voiture que j'avais perdues au marché central.",
    rating: 5,
    avatar: "CN",
  },
  {
    name: "Emmanuel Fouda",
    location: "Garoua",
    text: "Grâce à RetrouvIt, j'ai retrouvé mon téléphone perdu dans un taxi. Le système de récompense motive vraiment les gens !",
    rating: 5,
    avatar: "EF",
  },
];

const categories = [
  { name: "Documents", icon: FileText, count: "2 340", color: "from-forest/20 to-forest/5 dark:from-forest-light/20 dark:to-forest-light/5", image: "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=600&h=400&fit=crop&q=80" },
  { name: "Électronique", icon: Smartphone, count: "1 856", color: "from-orange-brand/20 to-orange-brand/5", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=400&fit=crop&q=80" },
  { name: "Clés", icon: Key, count: "3 120", color: "from-forest/20 to-forest/5 dark:from-forest-light/20 dark:to-forest-light/5", image: "https://images.unsplash.com/photo-1621410060611-765a3140b0e2?w=600&h=400&fit=crop&q=80" },
  { name: "Sacs & Bagages", icon: Briefcase, count: "890", color: "from-orange-brand/20 to-orange-brand/5", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=400&fit=crop&q=80" },
  { name: "Animaux", icon: PawPrint, count: "189", color: "from-forest/20 to-forest/5 dark:from-forest-light/20 dark:to-forest-light/5", image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=400&fit=crop&q=80" },
  { name: "Véhicules", icon: Car, count: "67", color: "from-orange-brand/20 to-orange-brand/5", image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=400&fit=crop&q=80" },
  { name: "Vêtements", icon: Shirt, count: "543", color: "from-forest/20 to-forest/5 dark:from-forest-light/20 dark:to-forest-light/5", image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&h=400&fit=crop&q=80" },
  { name: "Bijoux", icon: Gem, count: "321", color: "from-orange-brand/20 to-orange-brand/5", image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=600&h=400&fit=crop&q=80" },
  { name: "Autres", icon: Package, count: "987", color: "from-forest/20 to-forest/5 dark:from-forest-light/20 dark:to-forest-light/5", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop&q=80" },
];

const features = [
  {
    title: "Matching intelligent",
    description: "Notre algorithme compare les objets perdus et trouvés pour trouver des correspondances automatiquement.",
    icon: Search,
    color: "bg-forest dark:bg-forest-light",
  },
  {
    title: "Messagerie sécurisée",
    description: "Échangez avec les autres utilisateurs sans partager vos informations personnelles.",
    icon: MessageCircle,
    color: "bg-orange-brand",
  },
  {
    title: "Système de récompenses",
    description: "Incitez les trouveurs à restituer vos objets avec un système de récompenses sécurisé.",
    icon: Wallet,
    color: "bg-forest dark:bg-forest-light",
  },
  {
    title: "Alertes temps réel",
    description: "Soyez notifié instantanément quand une correspondance est trouvée.",
    icon: Bell,
    color: "bg-orange-brand",
  },
];

const demoVideos = [
  { title: "Déclarez un objet", description: "Publiez une annonce en quelques secondes avec photos et localisation", video: "https://videos.pexels.com/video-files/5054204/5054204-sd_960_540_30fps.mp4", poster: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=450&fit=crop&q=70" },
  { title: "Chat & Messagerie", description: "Échangez en toute sécurité avec les trouveurs via le chat intégré", video: "https://videos.pexels.com/video-files/3129671/3129671-sd_960_540_25fps.mp4", poster: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=450&fit=crop&q=70" },
  { title: "Matching intelligent", description: "Notre algorithme trouve automatiquement les correspondances", video: "https://videos.pexels.com/video-files/3141209/3141209-sd_960_540_25fps.mp4", poster: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=450&fit=crop&q=70" },
];

// ─── Component ─────────────────────────────────────────────────────

export default function LandingPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [currentTestimonial, setCurrentTestimonial] = React.useState(0);
  const [modalVideoIndex, setModalVideoIndex] = React.useState<number | null>(null);
  const modalVideo = modalVideoIndex !== null ? demoVideos[modalVideoIndex] : null;

  // Auto-rotate testimonials
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      {/* ═══ Navigation ═══ */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest dark:bg-forest-light shadow-lg shadow-forest/20 dark:shadow-forest-light/20">
              <MapPin className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Retrouv<span className="text-orange-brand">It</span></span>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            {[
              { label: "Comment ça marche", href: "#how" },
              { label: "Fonctionnalités", href: "#features" },
              { label: "Avis", href: "#testimonials" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="font-medium">Admin</Button>
                  </Link>
                )}
                <Link href="/feed">
                  <Button size="sm" className="font-medium bg-forest hover:bg-forest/90 dark:bg-forest-light dark:hover:bg-forest-light/90 shadow-lg shadow-forest/20 dark:shadow-forest-light/20">
                    Fil d'actualité
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="font-medium">Connexion</Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm" className="font-medium bg-forest hover:bg-forest/90 dark:bg-forest-light dark:hover:bg-forest-light/90 shadow-lg shadow-forest/20 dark:shadow-forest-light/20">
                    Commencer
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t md:hidden animate-slide-up">
            <div className="space-y-1 px-4 py-3">
              <a href="#how" className="block py-2.5 text-sm font-medium">Comment ça marche</a>
              <a href="#features" className="block py-2.5 text-sm font-medium">Fonctionnalités</a>
              <a href="#testimonials" className="block py-2.5 text-sm font-medium">Avis</a>
              <Separator className="my-2" />
              {isAuthenticated ? (
                <Link href="/feed">
                  <Button className="w-full mt-2 bg-forest dark:bg-forest-light" size="sm">Fil d'actualité</Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/login" className="block py-2.5 text-sm font-medium">Connexion</Link>
                  <Link href="/auth/register">
                    <Button className="w-full mt-2 bg-forest dark:bg-forest-light" size="sm">Commencer</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ═══ Hero Section ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-forest via-forest/95 to-forest/80 dark:from-forest-light/20 dark:via-[#121220] dark:to-[#1a1a2e]">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-orange-brand blur-[100px]" />
          <div className="absolute bottom-10 right-20 h-96 w-96 rounded-full bg-forest-light blur-[120px]" />
          <div className="absolute top-40 right-40 h-48 w-48 rounded-full bg-orange-brand/50 blur-[80px]" />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:py-32 relative">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left: Text */}
            <div className="max-w-xl animate-fade-in">
              <Badge className="mb-5 bg-white/10 text-white border-white/20 hover:bg-white/15">
                {t("landing.badge")}
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-white leading-[1.1]">
                {t("landing.heroTitle1")}{" "}
                <span className="text-orange-brand">{t("landing.heroTitle2")}</span>
              </h1>
              <p className="mt-6 text-lg text-white/70 max-w-lg leading-relaxed">
                {t("landing.heroDescription")}
              </p>

              {/* Search Bar */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("landing.searchPlaceholder")}
                    className="pl-11 h-14 bg-white/95 dark:bg-card border-0 shadow-xl rounded-xl text-foreground"
                  />
                </div>
                <Link href="/feed/lost">
                  <Button size="lg" className="h-14 px-8 bg-orange-brand hover:bg-orange-brand/90 text-white shadow-xl shadow-orange-brand/30 rounded-xl font-medium w-full sm:w-auto">
                    {t("landing.searchButton")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-sm text-white/50">
                <span>{t("landing.popular")} :</span>
                {["iPhone", "Portefeuille", "Clés", "Sac à dos"].map((term) => (
                  <Link
                    key={term}
                    href={`/feed/lost?q=${term}`}
                    className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 hover:bg-white/15 hover:text-white transition-all text-xs"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: Phone mockups */}
            <div className="relative hidden lg:block animate-slide-in-right" style={{ animationDelay: "200ms" }}>
              <div className="relative mx-auto w-[320px]">
                {/* Main phone */}
                <div className="relative rounded-[2.5rem] border-4 border-white/20 bg-white/10 backdrop-blur-sm p-2 shadow-2xl">
                  <div className="rounded-[2rem] overflow-hidden bg-card aspect-[9/16]">
                    {/* App header */}
                    <div className="bg-forest dark:bg-forest-light p-4 text-white">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-sm">RetrouvIt</span>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-white/50" />
                        <div className="bg-white/15 rounded-lg pl-8 pr-3 py-2 text-xs text-white/60">Rechercher un objet...</div>
                      </div>
                    </div>
                    {/* App content */}
                    <div className="p-3 space-y-2">
                      {[
                        { title: "iPhone 15 Pro Max", cat: "Électronique", city: "Yaoundé", color: "bg-orange-brand" },
                        { title: "Portefeuille cuir", cat: "Documents", city: "Douala", color: "bg-forest dark:bg-forest-light" },
                        { title: "Clés de voiture", cat: "Clés", city: "Bafoussam", color: "bg-orange-brand" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", item.color)}>
                            <Package className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{item.title}</p>
                            <p className="text-[10px] text-muted-foreground">{item.cat} · {item.city}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] shrink-0">Actif</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating notification card */}
                <div className="absolute -top-4 -right-8 rounded-2xl bg-card border shadow-xl p-3 animate-float w-52">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-forest/10 dark:bg-forest-light/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-forest dark:text-forest-light" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Match trouvé !</p>
                      <p className="text-[10px] text-muted-foreground">iPhone 15 Pro</p>
                    </div>
                  </div>
                </div>

                {/* Floating chat card */}
                <div className="absolute -bottom-6 -left-8 rounded-2xl bg-card border shadow-xl p-3 w-48" style={{ animation: "float 4s ease-in-out infinite 1s" }}>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-orange-brand/10 flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-orange-brand" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Nouveau message</p>
                      <p className="text-[10px] text-muted-foreground truncate">Bonjour, j'ai trouvé...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Stats ═══ */}
      <section className="relative -mt-8 z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 bg-card rounded-2xl shadow-xl border p-6 stagger-children">
            {getStats(t).map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex justify-center mb-2">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-muted", stat.color)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section id="how" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3 border-forest/30 text-forest dark:border-forest-light dark:text-forest-light">{t("landing.howBadge")}</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {t("landing.howTitle")}{" "}
              <span className="text-forest dark:text-forest-light">{t("landing.howSubtitle")}</span>
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-forest/20 via-orange-brand/30 to-forest/20 dark:from-forest-light/20 dark:via-orange-brand/30 dark:to-forest-light/20" />

            {steps.map((step, i) => (
              <div key={step.step} className="relative text-center group hover-lift">
                <div className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-6 text-white font-bold text-xl shadow-lg transition-transform group-hover:scale-110",
                  step.color
                )}>
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ App Demo Section ═══ */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-forest/5 to-transparent dark:from-forest-light/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3 border-orange-brand/30 text-orange-brand">{t("landing.demoBadge")}</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {t("landing.demoTitle1")}{" "}
              <span className="text-orange-brand">{t("landing.demoTitle2")}</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              {t("landing.demoDescription")}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {demoVideos.map((demo, i) => (
              <Card key={demo.title} className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <LazyVideo
                  src={demo.video}
                  poster={demo.poster}
                  onPlay={() => setModalVideoIndex(i)}
                />
                <CardContent className="p-5">
                  <h3 className="font-semibold text-lg mb-1">{demo.title}</h3>
                  <p className="text-sm text-muted-foreground">{demo.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Features ═══ */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3">{t("landing.featuresBadge")}</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {t("landing.featuresTitle1")}{" "}
              <span className="text-forest dark:text-forest-light">{t("landing.featuresTitle2")}</span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature, i) => (
              <Card key={feature.title} className="border-0 shadow-sm bg-card hover:shadow-md transition-all hover-lift group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-transform group-hover:scale-110", feature.color)}>
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Categories ═══ */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-orange-brand/5 to-transparent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3 border-orange-brand/30 text-orange-brand">{t("landing.categoriesBadge")}</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {t("landing.categoriesTitle1")}{" "}
              <span className="text-orange-brand">{t("landing.categoriesTitle2")}</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((cat) => (
              <Link key={cat.name} href={`/feed/lost?category=${cat.name}`}>
                <Card className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border-0 overflow-hidden">
                  <div className="relative h-32 overflow-hidden">
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjZjBmMGYwIiB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIvPjwvc3ZnPg=="
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex items-center gap-2">
                        <cat.icon className="h-4 w-4 text-white" />
                        <h3 className="font-semibold text-white text-sm">{cat.name}</h3>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">{cat.count} annonces</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Testimonials ═══ */}
      <section id="testimonials" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3 border-forest/30 text-forest dark:border-forest-light dark:text-forest-light">{t("landing.testimonialsBadge")}</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {t("landing.testimonialsTitle1")}{" "}
              <span className="text-forest dark:text-forest-light">{t("landing.testimonialsTitle2")}</span>
            </h2>
          </div>

          {/* Testimonial Slider */}
          <div className="relative max-w-4xl mx-auto">
            <div className="overflow-hidden rounded-2xl">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
              >
                {testimonials.map((testimonial, i) => (
                  <div key={i} className="w-full shrink-0 px-4">
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-muted/30">
                      <CardContent className="p-8 sm:p-10">
                        <div className="flex gap-1 mb-4">
                          {Array.from({ length: testimonial.rating }).map((_, j) => (
                            <Star key={j} className="h-5 w-5 fill-orange-brand text-orange-brand" />
                          ))}
                        </div>
                        <p className="text-lg text-muted-foreground leading-relaxed mb-6 italic">
                          &ldquo;{testimonial.text}&rdquo;
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-forest/10 dark:bg-forest-light/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-forest dark:text-forest-light">{testimonial.avatar}</span>
                          </div>
                          <div>
                            <p className="font-semibold">{testimonial.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {testimonial.location}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation dots */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTestimonial(i)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    currentTestimonial === i
                      ? "w-8 bg-forest dark:bg-forest-light"
                      : "w-2 bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>

            {/* Arrow buttons */}
            <button
              onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 h-10 w-10 rounded-full bg-card border shadow-lg flex items-center justify-center hover:bg-muted transition-colors hidden sm:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 h-10 w-10 rounded-full bg-card border shadow-lg flex items-center justify-center hover:bg-muted transition-colors hidden sm:flex"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-forest via-forest to-forest/80 dark:from-forest-light/30 dark:via-[#1a1a2e] dark:to-[#121220]" />
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-10 right-20 h-48 w-48 rounded-full bg-orange-brand blur-[80px]" />
              <div className="absolute bottom-10 left-20 h-64 w-64 rounded-full bg-forest-light blur-[100px]" />
            </div>

            <div className="relative p-8 sm:p-12 lg:p-16">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-white">
                  {t("landing.ctaTitle1")}{" "}
                  <span className="text-orange-brand">{t("landing.ctaTitle2")}</span>{" "}{t("landing.ctaTitle3")}
                </h2>
                <p className="mt-4 text-white/70 text-lg">
                  {t("landing.ctaDescription")}
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link href="/auth/register">
                    <Button size="lg" className="h-14 px-8 bg-orange-brand hover:bg-orange-brand/90 text-white shadow-xl shadow-orange-brand/30 font-medium rounded-xl">
                      {t("landing.ctaButton1")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/feed/lost">
                    <Button variant="outline" size="lg" className="h-14 px-8 border-white/20 text-white hover:bg-white/10 rounded-xl font-medium">
                      {t("landing.ctaButton2")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t bg-card">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center space-x-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest dark:bg-forest-light">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold">Retrouv<span className="text-orange-brand">It</span></span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t("landing.footerDescription")}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">{t("landing.footerProduct")}</h3>
              <ul className="space-y-2">
                <li><a href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("landing.footerHowItWorks")}</a></li>
                <li><Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("landing.footerPricing")}</Link></li>
                <li><Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("landing.footerFaq")}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">{t("landing.footerCompany")}</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("landing.footerAbout")}</Link></li>
                <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("landing.footerContact")}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">{t("landing.footerLegal")}</h3>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("landing.footerPrivacy")}</Link></li>
                <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("landing.footerTerms")}</Link></li>
              </ul>
            </div>
          </div>
          <Separator className="my-8" />
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">{t("landing.footerCopyright")}</p>
          </div>
        </div>
      </footer>

      {/* ═══ Video Modal ═══ */}
      <VideoModal
        open={modalVideoIndex !== null}
        onClose={() => setModalVideoIndex(null)}
        src={modalVideo?.video ?? ""}
        poster={modalVideo?.poster}
        title={modalVideo?.title}
        description={modalVideo?.description}
        currentIndex={modalVideoIndex ?? 0}
        totalCount={demoVideos.length}
        onPrev={() => setModalVideoIndex((prev) => prev !== null && prev > 0 ? prev - 1 : prev)}
        onNext={() => setModalVideoIndex((prev) => prev !== null && prev < demoVideos.length - 1 ? prev + 1 : prev)}
      />
    </div>
  );
}
