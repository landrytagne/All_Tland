"use client";

import { Wrench, MapPin } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-6">
          <Wrench className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <MapPin className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold">RetrouvIt</span>
        </div>
        <h1 className="text-2xl font-bold mb-3">Maintenance planifiée</h1>
        <p className="text-muted-foreground mb-4">
          Nous effectuons une mise à jour de notre système. Nous serons de retour très rapidement.
        </p>
        <p className="text-sm text-muted-foreground">
          Estimé : 30 minutes
        </p>
      </div>
    </div>
  );
}
