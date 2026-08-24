"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}

export function AuthGuard({
  children,
  requireAuth = true,
  requireAdmin = false,
  fallback,
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, isAdmin, isBanned } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      router.push("/auth/login");
    }

    if (requireAdmin && !isAdmin) {
      router.push("/feed");
    }

    if (isAuthenticated && isBanned) {
      router.push("/auth/banned");
    }
  }, [isLoading, isAuthenticated, isAdmin, isBanned, requireAuth, requireAdmin, router]);

  if (isLoading) {
    return (
      fallback || (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        </div>
      )
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return null;
  }

  if (isAuthenticated && isBanned) {
    return null;
  }

  return <>{children}</>;
}
