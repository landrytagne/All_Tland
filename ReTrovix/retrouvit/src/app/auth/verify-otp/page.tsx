"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { otpApi } from "@/lib/api-otp";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Vérification OTP 2FA (CDC §5.1 / §6.1).
 * Deux modes (via query params) :
 *  - ?email=...&mode=login    : connexion 2FA → émet les tokens
 *  - ?email=...&mode=register : activation du compte inscrit
 */
function VerifyOTPContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithTokens } = useAuth();

  const email = searchParams.get("email") ?? "";
  const mode = searchParams.get("mode") === "register" ? "register" : "login";

  const [otp, setOtp] = React.useState(["", "", "", "", "", ""]);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] ?? "";
      setOtp(newOtp);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Saisissez les 6 chiffres du code.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (mode === "register") {
        const res = await otpApi.verifyRegistration(email, code);
        setSuccess(res.message || "Compte activé !");
        setTimeout(() => router.push("/auth/login"), 1500);
      } else {
        const res = await otpApi.verifyLoginOtp(email, code);
        if (!res.token || !res.refreshToken) {
          throw new Error("Réponse de vérification invalide");
        }
        // Connexion 2FA réussie : établit la session avec les tokens reçus
        await loginWithTokens({
          token: res.token,
          refreshToken: res.refreshToken,
          expiresIn: res.expiresIn,
          email: res.email ?? email,
          role: res.role,
          id: res.id,
          name: res.name,
        });
        router.push("/feed");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Code invalide";
      setError(message);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    setIsResending(true);
    try {
      if (mode === "register") {
        const res = await otpApi.resendRegistrationOtp(email);
        setSuccess(res.message || "Nouveau code envoyé.");
      } else {
        const res = await otpApi.requestLoginOtp(email);
        setSuccess(res.message || "Nouveau code envoyé.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de renvoyer le code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center space-x-2 mb-8 justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <MapPin className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">RetrouvIt</span>
        </Link>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "register" ? "Activez votre compte" : "Vérification en deux étapes"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entrez le code à 6 chiffres envoyé à{" "}
            <span className="font-medium text-foreground">{email || "votre email"}</span>.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <span className="text-destructive">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
            <span className="text-green-700 dark:text-green-400">{success}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="h-12 w-12 text-center text-lg font-semibold"
                disabled={isSubmitting}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vérification...
              </>
            ) : (
              mode === "register" ? "Activer mon compte" : "Vérifier et se connecter"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Vous n&apos;avez pas reçu le code ?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="font-medium text-primary hover:underline disabled:opacity-50"
            >
              {isResending ? "Envoi..." : "Renvoyer"}
            </button>
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <ArrowLeft className="h-3 w-3" />
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <React.Suspense fallback={null}>
      <VerifyOTPContent />
    </React.Suspense>
  );
}
