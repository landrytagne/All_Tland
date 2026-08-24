"use client";

import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <div className="text-center max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
              <WifiOff className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center border-2 border-background">
              <Wifi className="h-4 w-4 text-destructive" />
            </div>
          </div>
        </div>

        {/* Text */}
        <h1 className="text-2xl font-bold mb-2">Pas de connexion</h1>
        <p className="text-muted-foreground mb-2">
          Vous êtes actuellement hors ligne.
        </p>
        <p className="text-sm text-muted-foreground/70 mb-8">
          Vérifiez votre connexion internet et réessayez.
        </p>

        {/* Retry button */}
        <Button
          onClick={() => window.location.reload()}
          className="gap-2"
          size="lg"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>

        {/* Go home */}
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => (window.location.href = "/")}
        >
          Retour à l&apos;accueil
        </Button>
      </div>
    </div>
  );
}
