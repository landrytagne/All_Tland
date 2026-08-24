"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { categories, cities } from "@/lib/data";
import { lostObjectsApi, foundObjectsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ImageUpload } from "@/components/image-upload";

export default function PublishPage() {
  return (
    <AuthGuard>
      <PublishContent />
    </AuthGuard>
  );
}

function PublishContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lostImageUrls, setLostImageUrls] = React.useState<string[]>([]);
  const [foundImageUrls, setFoundImageUrls] = React.useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, type: "lost" | "found") => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const imageUrls = type === "lost" ? lostImageUrls : foundImageUrls;

    try {
      const firstImage = imageUrls.length > 0 ? imageUrls[0] : undefined;
      const allImages = imageUrls.length > 0 ? imageUrls.join(",") : undefined;

      if (type === "lost") {
        await lostObjectsApi.create({
          title: form.get("title") as string,
          description: form.get("description") as string,
          category: form.get("category") as string,
          location: form.get("location") as string,
          city: form.get("city") as string,
          dateLost: (form.get("date") as string) || undefined,
          reward: form.get("reward") ? Number(form.get("reward")) : undefined,
          image: firstImage,
          images: allImages,
        });
      } else {
        await foundObjectsApi.create({
          title: form.get("title") as string,
          description: form.get("description") as string,
          category: form.get("category") as string,
          location: form.get("location") as string,
          city: form.get("city") as string,
          dateFound: (form.get("date") as string) || undefined,
          image: firstImage,
          images: allImages,
        });
      }

      setSuccess(true);
      setTimeout(() => router.push("/feed"), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue lors de la publication");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <MainLayout showFooter={false}>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Annonce publiée !</h1>
          <p className="text-muted-foreground">
            Votre annonce a été publiée avec succès. Le moteur de matching va rechercher des correspondances.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showFooter={false}>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Publier un objet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Déclarez un objet perdu ou trouvé pour aider à le retrouver.
          </p>
        </div>

        {error && (
          <Card className="mb-4 border-destructive bg-destructive/10">
            <CardContent className="p-4">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="lost" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="lost">Objet perdu</TabsTrigger>
            <TabsTrigger value="found">Objet trouvé</TabsTrigger>
          </TabsList>

          <TabsContent value="lost">
            <form
              className="space-y-6"
              onSubmit={(e) => handleSubmit(e, "lost")}
            >
              {/* Photos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ImageUpload
                    onUrlsChange={setLostImageUrls}
                    disabled={isSubmitting}
                  />
                </CardContent>
              </Card>

              {/* Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Détails de l&apos;objet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lost-title">Titre *</Label>
                    <Input
                      name="title"
                      id="lost-title"
                      placeholder="Ex: iPhone 15 Pro Max perdu"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lost-category">Catégorie *</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lost-description">Description *</Label>
                    <Textarea
                      name="description"
                      id="lost-description"
                      placeholder="Décrivez l'objet en détail (couleur, marque, état, contenu...)"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lost-date">Date de perte *</Label>
                    <Input name="date" id="lost-date" type="date" required />
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localisation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lost-city">Ville *</Label>
                    <Select name="city" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une ville" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lost-location">Quartier / Lieu précis *</Label>
                    <Input name="location" id="lost-location" placeholder="Ex: Bastos, près du restaurant Le Cobac" required />
                  </div>
                </CardContent>
              </Card>

              {/* Reward */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Récompense (optionnel)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="lost-reward">Montant en FCFA</Label>
                    <Input name="reward" id="lost-reward" type="number" placeholder="Ex: 25000" />
                    <p className="text-xs text-muted-foreground">
                      Une récompense incite les trouveurs à restituer votre objet.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Publication en cours...
                  </>
                ) : (
                  "Publier l'annonce"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="found">
            <form
              className="space-y-6"
              onSubmit={(e) => handleSubmit(e, "found")}
            >
              {/* Photos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ImageUpload
                    onUrlsChange={setFoundImageUrls}
                    disabled={isSubmitting}
                  />
                </CardContent>
              </Card>

              {/* Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Détails de l&apos;objet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="found-title">Titre *</Label>
                    <Input
                      name="title"
                      id="found-title"
                      placeholder="Ex: Porte-monnaie trouvé"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="found-category">Catégorie *</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="found-description">Description *</Label>
                    <Textarea
                      name="description"
                      id="found-description"
                      placeholder="Décrivez l'objet en détail (couleur, marque, état, contenu...)"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="found-date">Date de découverte *</Label>
                    <Input name="date" id="found-date" type="date" required />
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localisation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="found-city">Ville *</Label>
                    <Select name="city" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une ville" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="found-location">Quartier / Lieu précis *</Label>
                    <Input name="location" id="found-location" placeholder="Ex: Bastos, près du restaurant Le Cobac" required />
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Publication en cours...
                  </>
                ) : (
                  "Publier l'annonce"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
