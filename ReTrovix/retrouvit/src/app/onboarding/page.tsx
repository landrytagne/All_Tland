"use client";

import * as React from "react";
import Link from "next/link";
import {
  MapPin,
  ArrowRight,
  ArrowLeft,
  Check,
  Search,
  Package,
  Bell,
  Shield,
  Upload,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { cities } from "@/lib/data";

const steps = [
  { id: 1, title: "Bienvenue", description: "Découvrez RetrouvIt" },
  { id: 2, title: "Votre profil", description: "Complétez vos informations" },
  { id: 3, title: "Préférences", description: "Personnalisez votre expérience" },
  { id: 4, title: "C'est parti !", description: "Votre compte est prêt" },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = React.useState(1);
  const progress = (currentStep / steps.length) * 100;

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, steps.length));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* Top bar */}
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <MapPin className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">RetrouvIt</span>
          </Link>
          <span className="text-sm text-muted-foreground">
            Étape {currentStep} sur {steps.length}
          </span>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b bg-background">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    currentStep > step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                {step.id < steps.length && (
                  <div
                    className={cn(
                      "hidden sm:block h-px w-12",
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="text-center space-y-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary mx-auto">
                <MapPin className="h-10 w-10 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-3">
                  Bienvenue sur RetrouvIt 👋
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  La plateforme camerounaise qui reconnecte les personnes avec leurs objets perdus.
                  En quelques étapes, votre compte sera prêt.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Search className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-xs font-medium">Recherchez</p>
                    <p className="text-[10px] text-muted-foreground">Parcourez les annonces</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Package className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-xs font-medium">Publiez</p>
                    <p className="text-[10px] text-muted-foreground">Déclarez vos objets</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-xs font-medium">Retrouvez</p>
                    <p className="text-[10px] text-muted-foreground">Récupérez en sécurité</p>
                  </CardContent>
                </Card>
              </div>
              <Button size="lg" onClick={nextStep} className="gap-2">
                Commencer <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Profile */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">Votre profil</h1>
                <p className="text-sm text-muted-foreground">
                  Complétez vos informations pour inspirer confiance.
                </p>
              </div>

              <Card>
                <CardContent className="p-6 space-y-4">
                  {/* Photo */}
                  <div className="flex justify-center">
                    <button className="relative group">
                      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    </button>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Ajoutez une photo de profil
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Prénom *</Label>
                      <Input placeholder="Jean" />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom *</Label>
                      <Input placeholder="Dupont" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Téléphone *</Label>
                    <Input type="tel" placeholder="+237 6XX XXX XXX" />
                  </div>

                  <div className="space-y-2">
                    <Label>Ville *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner votre ville" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Bio (optionnel)</Label>
                    <Textarea placeholder="Quelques mots sur vous..." rows={3} />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep} className="gap-1">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={nextStep} className="gap-2">
                  Continuer <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preferences */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">Préférences</h1>
                <p className="text-sm text-muted-foreground">
                  Personnalisez votre expérience sur RetrouvIt.
                </p>
              </div>

              <Card>
                <CardContent className="p-6 space-y-5">
                  <div>
                    <p className="text-sm font-medium mb-3">Notifications</p>
                    <div className="space-y-3">
                      {[
                        { id: "match", label: "Nouvelles correspondances", defaultChecked: true },
                        { id: "message", label: "Nouveaux messages", defaultChecked: true },
                        { id: "reward", label: "Mises à jour de récompenses", defaultChecked: true },
                        { id: "newsletter", label: "Newsletter RetrouvIt", defaultChecked: false },
                      ].map((pref) => (
                        <label key={pref.id} className="flex items-center gap-3 cursor-pointer">
                          <Checkbox defaultChecked={pref.defaultChecked} />
                          <span className="text-sm">{pref.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <p className="text-sm font-medium mb-3">Catégories d&apos;intérêt</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Sélectionnez les catégories pour recevoir des alertes personnalisées.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {["Électronique", "Documents", "Clés", "Sacs & Bagages", "Animaux", "Bijoux"].map((cat) => (
                        <Badge key={cat} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep} className="gap-1">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={nextStep} className="gap-2">
                  Terminer <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="text-center space-y-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 mx-auto">
                <Check className="h-10 w-10 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-3">
                  Vous êtes prêt ! 🎉
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Votre compte RetrouvIt est configuré. Vous pouvez dès maintenant
                  publier des annonces et rechercher des objets.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <Link href="/feed">
                  <Button className="w-full gap-2">
                    Dashboard <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/publish">
                  <Button variant="outline" className="w-full gap-2">
                    Publier un objet
                  </Button>
                </Link>
              </div>
              <Link href="/feed" className="text-sm text-muted-foreground hover:text-foreground">
                Passer l&apos;introduction
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
