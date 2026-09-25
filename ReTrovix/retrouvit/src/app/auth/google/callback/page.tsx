"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { googleAuthApi } from "@/lib/api-google";

/**
 * Callback OAuth2 Google (flux Authorization Code — CDC §6.1).
 * Reçoit ?code=... de Google, l'échange contre les JWT internes
 * côté backend, puis établit la session.
 */
function GoogleCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithTokens } = useAuth();

  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const code = searchParams.get("code");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      setError("Connexion Google annulée.");
      return;
    }
    if (!code) {
      setError("Code d'autorisation manquant.");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    googleAuthApi
      .loginWithAuthorizationCode(code, redirectUri)
      .then(async (res) => {
        if (!res.token || !res.refreshToken) {
          throw new Error("Réponse Google invalide");
        }
        await loginWithTokens({
          token: res.token,
          refreshToken: res.refreshToken,
          expiresIn: res.expiresIn,
          email: res.email,
          role: res.role,
          id: res.id,
          name: res.name,
        });
        router.push("/feed");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Échec de la connexion Google");
      });
  }, [searchParams, router, loginWithTokens]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="flex items-center space-x-2 mb-8 justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <MapPin className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">RetrouvIt</span>
        </Link>

        {error ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <h1 className="text-xl font-bold mb-2">Connexion impossible</h1>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button asChild className="w-full">
              <Link href="/auth/login">Retour à la connexion</Link>
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-sm text-muted-foreground">Connexion avec Google en cours...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <React.Suspense fallback={null}>
      <GoogleCallbackContent />
    </React.Suspense>
  );
}
