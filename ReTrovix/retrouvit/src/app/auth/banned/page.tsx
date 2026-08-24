"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Ban, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function BannedPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Ban className="h-8 w-8 text-destructive" />
          </div>

          <h1 className="text-xl font-bold mb-2">Compte suspendu</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Votre compte a été suspendu par un administrateur.
          </p>

          {user?.banReason && (
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 mb-4">
              <p className="text-xs font-medium text-destructive mb-1">Raison :</p>
              <p className="text-sm">{user.banReason}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground mb-6">
            Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, veuillez contacter le support.
          </p>

          <Button variant="outline" className="w-full gap-2" onClick={() => { logout(); router.push("/auth/login"); }}>
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
