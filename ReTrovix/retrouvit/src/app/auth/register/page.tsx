"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Shield,
  Zap,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const passwordValid = password.length >= 8;
  const passwordHasNumber = /\d/.test(password);
  const passwordHasUpper = /[A-Z]/.test(password);
  const formValid = name && email && passwordValid && passwordHasNumber && passwordHasUpper && acceptedTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!acceptedTerms) {
      setError("Vous devez accepter les conditions d'utilisation.");
      return;
    }
    if (!formValid) {
      setError("Veuillez remplir tous les champs correctement.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Inscription en 2 étapes avec 2FA (CDC §5.1) : le compte est créé
      // inactif et un code d'activation est envoyé par email.
      const { otpApi } = await import("@/lib/api-otp");
      await otpApi.registerWithOtp({ name, email, password });
      router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}&mode=register`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur d'inscription";
      if (message.includes("409") || message.includes("already exists") || message.includes("duplicate")) {
        setError("Un compte avec cet email existe déjà.");
      } else if (message.includes("Failed to fetch")) {
        setError("Impossible de contacter le serveur.");
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ═══ Left: Brand panel ═══ */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-orange-brand via-orange-brand/95 to-orange-brand/80 dark:from-orange-brand/20 dark:via-[#121220] dark:to-[#1a1a2e]">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-white/10 blur-[100px]" />
          <div className="absolute bottom-20 right-10 h-64 w-64 rounded-full bg-forest/20 dark:bg-forest-light/20 blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2.5 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-2xl text-white">Retrouv<span className="text-white/80">It</span></span>
          </Link>

          {/* Hero text */}
          <div className="max-w-md animate-fade-in">
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Commencez à{" "}
              <span className="text-white/80">retrouver</span> vos objets
            </h2>
            <p className="text-lg text-white/60 mb-10">
              Créez votre compte gratuitement et rejoignez la communauté.
            </p>

            {/* Benefits */}
            <div className="space-y-5">
              {[
                { icon: Shield, title: "100% sécurisé", desc: "Vos données sont protégées" },
                { icon: Zap, title: "Matching intelligent", desc: "Trouvez vos objets plus vite" },
                { icon: Heart, title: "Gratuit pour toujours", desc: "Aucun frais caché" },
              ].map((benefit) => (
                <div key={benefit.title} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <benefit.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{benefit.title}</p>
                    <p className="text-sm text-white/50">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Right: Form ═══ */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-12 bg-background overflow-y-auto">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center space-x-2.5 mb-10 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest dark:bg-forest-light shadow-lg shadow-forest/20 dark:shadow-forest-light/20">
              <MapPin className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-bold text-xl">Retrouv<span className="text-orange-brand">It</span></span>
          </Link>

          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold tracking-tight">Créer un compte</h1>
            <p className="mt-2 text-muted-foreground">
              Rejoignez des milliers d&apos;utilisateurs.
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm animate-scale-in">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <span className="text-destructive">{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Nom complet</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Jean Dupont"
                  className="pl-10 h-12 rounded-xl"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  className="pl-10 h-12 rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-12 rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Password strength */}
              {password.length > 0 && (
                <div className="space-y-1 text-xs mt-2">
                  {[
                    { label: "8 caractères minimum", valid: passwordValid },
                    { label: "Au moins un chiffre", valid: passwordHasNumber },
                    { label: "Au moins une majuscule", valid: passwordHasUpper },
                  ].map((rule) => (
                    <div key={rule.label} className="flex items-center gap-1.5">
                      {rule.valid ? (
                        <CheckCircle2 className="h-3 w-3 text-forest dark:text-forest-light" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                      )}
                      <span className={rule.valid ? "text-forest dark:text-forest-light font-medium" : "text-muted-foreground"}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-start space-x-2 pt-1">
              <Checkbox
                id="terms"
                className="mt-0.5"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                disabled={isSubmitting}
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                J&apos;accepte les{" "}
                <Link href="/terms" className="text-orange-brand hover:underline font-medium">conditions</Link>{" "}
                et la{" "}
                <Link href="/privacy" className="text-orange-brand hover:underline font-medium">confidentialité</Link>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-medium bg-forest hover:bg-forest/90 dark:bg-forest-light dark:hover:bg-forest-light/90 shadow-lg shadow-forest/20 dark:shadow-forest-light/20"
              disabled={isSubmitting || !formValid}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <>
                  Créer mon compte
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">ou</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-11 rounded-xl font-medium" disabled>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </Button>
            <Button variant="outline" className="h-11 rounded-xl font-medium" disabled>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </Button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href="/auth/login" className="font-semibold text-orange-brand hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
