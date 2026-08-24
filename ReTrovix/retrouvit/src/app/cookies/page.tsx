"use client";

import { useState } from "react";
import {
  Cookie,
  Shield,
  Settings,
  BarChart3,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const cookieCategories = [
  {
    id: "essential",
    icon: Shield,
    title: "Cookies essentiels",
    required: true,
    description:
      "Ces cookies sont indispensables au fonctionnement du site. Ils vous permettent de naviguer, d'utiliser les fonctionnalités de base et d'accéder aux zones sécurisées. Sans ces cookies, le site ne peut pas fonctionner correctement.",
    cookies: [
      {
        name: "session_id",
        purpose: "Maintient votre session de connexion",
        duration: "Session",
        type: "HTTP Only",
      },
      {
        name: "csrf_token",
        purpose: "Protection contre les attaques CSRF",
        duration: "Session",
        type: "HTTP Only",
      },
      {
        name: "cookie_consent",
        purpose: "Enregistre votre choix concernant les cookies",
        duration: "1 an",
        type: "First Party",
      },
    ],
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Cookies analytiques",
    required: false,
    description:
      "Ces cookies nous aident à comprendre comment vous utilisez notre site (pages visitées, temps passé, erreurs). Les données sont anonymisées et utilisées uniquement pour améliorer nos services.",
    cookies: [
      {
        name: "_ga",
        purpose: "Distinction des utilisateurs via Google Analytics",
        duration: "2 ans",
        type: "Third Party",
      },
      {
        name: "_ga_*",
        purpose: "Maintien de l'état de la session",
        duration: "2 ans",
        type: "Third Party",
      },
      {
        name: "_gid",
        purpose: "Distinction des utilisateurs",
        duration: "24 heures",
        type: "Third Party",
      },
    ],
  },
  {
    id: "functional",
    icon: Settings,
    title: "Cookies fonctionnels",
    required: false,
    description:
      "Ces cookies mémorisent vos préférences (langue, région, thème) pour vous offrir une expérience personnalisée. Si vous ne les acceptez pas, certaines fonctionnalités peuvent ne pas être disponibles.",
    cookies: [
      {
        name: "language",
        purpose: "Mémorise votre langue préférée",
        duration: "1 an",
        type: "First Party",
      },
      {
        name: "theme",
        purpose: "Mémorise votre thème (clair/sombre)",
        duration: "1 an",
        type: "First Party",
      },
      {
        name: "location",
        purpose: "Mémorise votre ville pour la recherche",
        duration: "30 jours",
        type: "First Party",
      },
    ],
  },
  {
    id: "marketing",
    icon: Megaphone,
    title: "Cookies publicitaires",
    required: false,
    description:
      "Ces cookies sont utilisés pour afficher des publicités pertinentes et mesurer l'efficacité de nos campagnes. Ils peuvent être placés par nos partenaires publicitaires et suivre votre navigation sur différents sites.",
    cookies: [
      {
        name: "_fbp",
        purpose: "Suivi des conversions Facebook Ads",
        duration: "3 mois",
        type: "Third Party",
      },
      {
        name: "_gcl_au",
        purpose: "Suivi des conversions Google Ads",
        duration: "3 mois",
        type: "Third Party",
      },
      {
        name: "fr",
        purpose: "Publicité ciblée Facebook",
        duration: "3 mois",
        type: "Third Party",
      },
    ],
  },
];

export default function CookiesPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    "essential"
  );
  const [settings, setSettings] = useState<Record<string, boolean>>({
    essential: true,
    analytics: false,
    functional: false,
    marketing: false,
  });

  const toggleCategory = (id: string) => {
    if (id === "essential") return;
    setSettings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const acceptAll = () => {
    setSettings({
      essential: true,
      analytics: true,
      functional: true,
      marketing: true,
    });
  };

  const refuseAll = () => {
    setSettings({
      essential: true,
      analytics: false,
      functional: false,
      marketing: false,
    });
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-background/50 py-20">
        <div className="container mx-auto px-4 relative">
          <div className="max-w-2xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Cookie className="w-3 h-3 mr-1.5" />
              Politique de cookies
            </Badge>
            <h1 className="text-4xl font-bold mb-4">
              Politique de cookies
            </h1>
            <p className="text-muted-foreground">
              Dernière mise à jour : 15 Août 2025
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Intro */}
          <div className="mb-10 space-y-4 text-sm leading-relaxed">
            <p>
              Ce site utilise des cookies et technologies similaires pour
              améliorer votre expérience de navigation, analyser le trafic et
              personnaliser le contenu. Conformément à la législation en vigueur
              (RGPD et Directive ePrivacy), nous vous informons de l&apos;utilisation
              de ces traceurs et vous donnons la possibilité de les gérer.
            </p>
            <p>
              Un cookie est un petit fichier texte déposé sur votre appareil
              (ordinateur, tablette, smartphone) lors de votre visite sur notre
              site. Il permet de reconnaître votre appareil et de mémoriser
              certaines informations.
            </p>
          </div>

          {/* Settings card */}
          <Card className="mb-10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">
                  ⚙️ Gérer mes préférences
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={refuseAll}>
                    <X className="w-3.5 h-3.5 mr-1" />
                    Tout refuser
                  </Button>
                  <Button size="sm" onClick={acceptAll}>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Tout accepter
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {cookieCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <cat.icon className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {cat.title}
                            </span>
                            {cat.required && (
                              <Badge variant="secondary" className="text-[10px]">
                                Toujours actif
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                            {cat.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() =>
                            setExpandedCategory(
                              expandedCategory === cat.id ? null : cat.id
                            )
                          }
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {expandedCategory === cat.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <Switch
                          checked={settings[cat.id as keyof typeof settings]}
                          onCheckedChange={() => toggleCategory(cat.id)}
                          disabled={cat.required}
                        />
                      </div>
                    </div>

                    {/* Expanded cookie list */}
                    {expandedCategory === cat.id && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-muted-foreground">
                                <th className="pb-2 font-medium">Cookie</th>
                                <th className="pb-2 font-medium">Finalité</th>
                                <th className="pb-2 font-medium">Durée</th>
                                <th className="pb-2 font-medium">Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cat.cookies.map((cookie) => (
                                <tr key={cookie.name} className="border-t">
                                  <td className="py-2 font-mono text-primary">
                                    {cookie.name}
                                  </td>
                                  <td className="py-2">{cookie.purpose}</td>
                                  <td className="py-2 text-muted-foreground">
                                    {cookie.duration}
                                  </td>
                                  <td className="py-2">
                                    <Badge
                                      variant={
                                        cookie.type === "HTTP Only"
                                          ? "default"
                                          : "outline"
                                      }
                                      className="text-[10px]"
                                    >
                                      {cookie.type}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={() => alert("Préférences sauvegardées !")}>
                  Sauvegarder mes préférences
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Detailed sections */}
          <div className="space-y-8 text-sm leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold mb-3">
                Cookies tiers
              </h2>
              <p className="text-muted-foreground mb-4">
                Certains cookies sont déposés par des services tiers que nous
                utilisons :
              </p>
              <ul className="space-y-2 text-muted-foreground ml-4">
                <li className="list-disc">
                  <strong>Google Analytics</strong> — Analyse de trafic et
                  comportement utilisateur
                </li>
                <li className="list-disc">
                  <strong>Google Ads</strong> — Suivi des conversions
                  publicitaires
                </li>
                <li className="list-disc">
                  <strong>Facebook Pixel</strong> — Retargeting et mesure
                  d&apos;efficacité
                </li>
                <li className="list-disc">
                  <strong>Intercom</strong> — Chat de support et analytics
                  produit
                </li>
                <li className="list-disc">
                  <strong>Sentry</strong> — Monitoring des erreurs techniques
                </li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-xl font-semibold mb-3">
                Comment gérer les cookies ?
              </h2>
              <p className="text-muted-foreground mb-4">
                Vous pouvez gérer vos préférences de cookies à tout moment en
                cliquant sur le bouton ci-dessous ou en modifiant les paramètres
                de votre navigateur :
              </p>
              <ul className="space-y-2 text-muted-foreground ml-4">
                <li className="list-disc">
                  <strong>Chrome</strong> : Paramètres → Confidentialité et
                  sécurité → Cookies
                </li>
                <li className="list-disc">
                  <strong>Firefox</strong> : Options → Vie privée et sécurité
                  → Cookies
                </li>
                <li className="list-disc">
                  <strong>Safari</strong> : Préférences → Confidentialité →
                  Cookies
                </li>
                <li className="list-disc">
                  <strong>Edge</strong> : Paramètres → Confidentialité →
                  Cookies
                </li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Attention : la désactivation de certains cookies peut altérer
                votre expérience de navigation.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-xl font-semibold mb-3">
                Durée de conservation
              </h2>
              <p className="text-muted-foreground">
                Les cookies de session sont automatiquement supprimés à la
                fermeture de votre navigateur. Les cookies persistants restent
                sur votre appareil pour la durée indiquée dans le tableau ci-
                dessus, ou jusqu&apos;à ce que vous les supprimiez manuellement via
                les paramètres de votre navigateur.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-xl font-semibold mb-3">
                Vos droits
              </h2>
              <p className="text-muted-foreground mb-4">
                Conformément au RGPD, vous disposez des droits suivants
                concernant vos données personnelles collectées via les cookies :
              </p>
              <ul className="space-y-2 text-muted-foreground ml-4">
                <li className="list-disc">
                  <strong>Droit d&apos;accès</strong> — Connaître les données
                  collectées
                </li>
                <li className="list-disc">
                  <strong>Droit de rectification</strong> — Corriger les
                  données inexactes
                </li>
                <li className="list-disc">
                  <strong>Droit à l&apos;effacement</strong> — Demander la
                  suppression de vos données
                </li>
                <li className="list-disc">
                  <strong>Droit d&apos;opposition</strong> — Vous opposer au
                  traitement de vos données
                </li>
                <li className="list-disc">
                  <strong>Droit à la portabilité</strong> — Récupérer vos
                  données dans un format structuré
                </li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Pour exercer ces droits, contactez-nous à{" "}
                <a
                  href="mailto:dpo@retrouvit.com"
                  className="text-primary hover:underline"
                >
                  dpo@retrouvit.com
                </a>
                .
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-xl font-semibold mb-3">Contact</h2>
              <p className="text-muted-foreground">
                Pour toute question relative à notre politique de cookies,
                contactez notre Délégué à la Protection des Données :
              </p>
              <div className="mt-3 p-4 bg-muted/50 rounded-lg text-sm">
                <p>
                  <strong>RetrouvIt SAS</strong>
                </p>
                <p>DPO : Antoine Leclerc</p>
                <p>Email : dpo@retrouvit.com</p>
                <p>Adresse : 42 Rue de la Tech, 75008 Paris</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
