"use client";

import * as React from "react";
import Link from "next/link";
import { Gift, Copy, Share2, Users, CheckCircle2, ArrowRight } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/stats-card";

export default function ReferralPage() {
  const [copied, setCopied] = React.useState(false);
  const referralCode = "RETR1234";

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://retrouvit.cm/invite/${referralCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Programme de parrainage
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Invitez vos amis et gagnez des récompenses !
          </p>
        </div>

        {/* Referral Card */}
        <Card className="mb-6 bg-primary text-primary-foreground">
          <CardContent className="p-6 text-center">
            <Gift className="h-12 w-12 mx-auto mb-4 opacity-80" />
            <h2 className="text-xl font-bold mb-2">Gagnez 5 000 FCFA par parrainage</h2>
            <p className="text-sm opacity-80 mb-6">
              Partagez votre lien et recevez 5 000 FCFA pour chaque ami qui s&apos;inscrit.
            </p>
            <div className="flex gap-2 max-w-md mx-auto">
              <Input
                value={`https://retrouvit.cm/invite/${referralCode}`}
                readOnly
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              <Button variant="secondary" onClick={handleCopy} className="gap-1">
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copié !" : "Copier"}
              </Button>
            </div>
            <div className="flex justify-center gap-3 mt-4">
              <Button variant="secondary" size="sm" className="gap-1">
                <Share2 className="h-3 w-3" /> Partager
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-3 mb-6">
          <StatsCard title="Parrainages" value={3} icon={Users} />
          <StatsCard title="Gagné" value="15 000 FCFA" icon={Gift} />
          <StatsCard title="En attente" value={1} icon={CheckCircle2} description="1 parrainage en cours" />
        </div>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Comment ça marche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { step: "1", title: "Partagez votre lien", description: "Envoyez votre lien de parrainage à vos amis." },
              { step: "2", title: "Ils s'inscrivent", description: "Votre ami crée un compte via votre lien." },
              { step: "3", title: "Vous gagnez !", description: "Recevez 5 000 FCFA une fois son compte vérifié." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
