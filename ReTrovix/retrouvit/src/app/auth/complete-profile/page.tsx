"use client";

import * as React from "react";
import Link from "next/link";
import {
  MapPin,
  ArrowRight,
  ArrowLeft,
  Check,
  Camera,
  Upload,
  Phone,
  Mail,
  Shield,
  CreditCard,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { cities } from "@/lib/data";

const profileSections = [
  { id: "info", label: "Informations", icon: FileText, completed: true },
  { id: "photo", label: "Photo", icon: Camera, completed: false },
  { id: "phone", label: "Téléphone", icon: Phone, completed: false },
  { id: "verify", label: "Vérification", icon: Shield, completed: false },
];

export default function CompleteProfilePage() {
  const [currentSection, setCurrentSection] = React.useState("info");
  const completedCount = profileSections.filter((s) => s.completed).length;
  const progress = (completedCount / profileSections.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <MapPin className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">RetrouvIt</span>
          </Link>
          <Link href="/feed">
            <Button variant="ghost" size="sm">Passer</Button>
          </Link>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b bg-background">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Profil complété à {Math.round(progress)}%
            </span>
            <span className="text-sm font-medium">
              {completedCount}/{profileSections.length} étapes
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      <div className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          {/* Section Navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {profileSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setCurrentSection(section.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                  currentSection === section.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : section.completed
                    ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                    : "bg-background hover:shadow-sm"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  section.completed
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : currentSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {section.completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <section.icon className="h-4 w-4" />
                  )}
                </div>
                <span className="text-xs font-medium">{section.label}</span>
              </button>
            ))}
          </div>

          {/* Section: Info */}
          {currentSection === "info" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Profil public</AlertTitle>
                  <AlertDescription>
                    Vos informations de base sont visibles par les autres utilisateurs.
                    Elles les aident à vous faire confiance.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Prénom *</Label>
                    <Input defaultValue="Landry" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input defaultValue="Tagne" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email *</Label>
                  <div className="flex gap-2">
                    <Input defaultValue="landry@retrouvit.com" type="email" className="flex-1" />
                    <Badge variant="success" className="shrink-0">Vérifié</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ville *</Label>
                  <Select defaultValue="Yaoundé">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quartier</Label>
                  <Input placeholder="Ex: Bastos, Messa..." />
                </div>

                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea placeholder="Parlez-nous de vous..." rows={3} />
                  <p className="text-xs text-muted-foreground">Maximum 200 caractères</p>
                </div>

                <Button onClick={() => setCurrentSection("photo")} className="gap-2">
                  Sauvegarder et continuer <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Section: Photo */}
          {currentSection === "photo" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Photo de profil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group cursor-pointer">
                    <div className="h-28 w-28 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      <Camera className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium">Ajoutez une photo</p>
                    <p className="text-xs text-muted-foreground">
                      Les profils avec photo ont 3x plus de chances d&apos;être contactés.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Upload className="h-3 w-3" /> Télécharger
                    </Button>
                    <Button variant="ghost" size="sm">Utiliser la caméra</Button>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Votre photo doit être claire, montrer votre visage et être récente.
                    Les photos floues ou inappropriées seront rejetées.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentSection("info")} className="gap-1">
                    <ArrowLeft className="h-4 w-4" /> Retour
                  </Button>
                  <Button onClick={() => setCurrentSection("phone")} className="gap-2">
                    Continuer <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section: Phone */}
          {currentSection === "phone" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Vérification du téléphone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  La vérification de votre numéro de téléphone augmente votre score de confiance
                  et permet aux autres utilisateurs de vous contacter facilement.
                </p>

                <div className="space-y-2">
                  <Label>Numéro de téléphone</Label>
                  <div className="flex gap-2">
                    <Input type="tel" placeholder="+237 6XX XXX XXX" className="flex-1" />
                    <Button variant="outline">Vérifier</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Code de vérification</Label>
                  <Input placeholder="Entrez le code reçu par SMS" />
                  <p className="text-xs text-muted-foreground">
                    Un code à 6 chiffres a été envoyé à votre numéro.
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentSection("photo")} className="gap-1">
                    <ArrowLeft className="h-4 w-4" /> Retour
                  </Button>
                  <Button onClick={() => setCurrentSection("verify")} className="gap-2">
                    Vérifier et continuer <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section: Verify */}
          {currentSection === "verify" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Vérification d&apos;identité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Badge vérifié</AlertTitle>
                  <AlertDescription>
                    Les comptes vérifiés inspirent plus de confiance et reçoivent
                    50% plus de réponses sur leurs annonces.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email vérifié</p>
                      <p className="text-xs text-muted-foreground">landry@retrouvit.com</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Téléphone</p>
                      <p className="text-xs text-muted-foreground">
                        {completedCount >= 3 ? "Vérifié" : "Non vérifié"}
                      </p>
                    </div>
                    {completedCount < 3 && (
                      <Button variant="outline" size="sm" onClick={() => setCurrentSection("phone")}>
                        Vérifier
                      </Button>
                    )}
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Pièce d&apos;identité</p>
                      <p className="text-xs text-muted-foreground">
                        Téléchargez une copie de votre CNI ou passeport
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Téléverser
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentSection("phone")} className="gap-1">
                    <ArrowLeft className="h-4 w-4" /> Retour
                  </Button>
                  <Button asChild className="gap-2">
                    <Link href="/feed">
                      Terminer <Check className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
