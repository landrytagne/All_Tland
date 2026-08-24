"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { matchesApi, type MatchResponse } from "@/lib/api-objects";
import { formatRelativeTime } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function MatchingPage() {
  return (
    <AuthGuard>
      <MatchingContent />
    </AuthGuard>
  );
}

function MatchingContent() {
  const { user } = useAuth();
  const [matches, setMatches] = React.useState<MatchResponse[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const data = await matchesApi.getAll();
      setMatches(data);
    } catch (err) {
      console.warn("Could not fetch matches:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (matchId: number) => {
    setActionLoading(matchId);
    try {
      await matchesApi.confirm(matchId);
      await fetchMatches();
    } catch (err) {
      console.error("Error confirming match:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (matchId: number) => {
    setActionLoading(matchId);
    try {
      await matchesApi.reject(matchId);
      await fetchMatches();
    } catch (err) {
      console.error("Error rejecting match:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingMatches = matches.filter(m => m.status === "PENDING");
  const confirmedMatches = matches.filter(m => m.status === "CONFIRMED");

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Correspondances
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nos algorithmes ont trouvé des correspondances potentielles pour vos annonces.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : matches.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune correspondance</h3>
              <p className="text-sm text-muted-foreground">
                Publiez des objets perdus ou trouvés pour commencer à recevoir des correspondances.
              </p>
              <Link href="/publish">
                <Button className="mt-4">Publier un objet</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">Toutes ({matches.length})</TabsTrigger>
              <TabsTrigger value="pending">En attente ({pendingMatches.length})</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmées ({confirmedMatches.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onConfirm={handleConfirm}
                  onReject={handleReject}
                  isLoading={actionLoading === match.id}
                />
              ))}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {pendingMatches.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">Aucune correspondance en attente</p>
                  </CardContent>
                </Card>
              ) : (
                pendingMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onConfirm={handleConfirm}
                    onReject={handleReject}
                    isLoading={actionLoading === match.id}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="confirmed" className="space-y-4">
              {confirmedMatches.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">Aucune correspondance confirmée</p>
                  </CardContent>
                </Card>
              ) : (
                confirmedMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onConfirm={handleConfirm}
                    onReject={handleReject}
                    isLoading={actionLoading === match.id}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}

function MatchCard({
  match,
  onConfirm,
  onReject,
  isLoading,
}: {
  match: MatchResponse;
  onConfirm: (id: number) => void;
  onReject: (id: number) => void;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Lost Object */}
          <div className="flex-1 p-4 rounded-lg bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20">
            <Badge variant="destructive" className="text-[10px] mb-2">Perdu</Badge>
            <h3 className="font-semibold text-sm mb-1">{match.lostObject.title}</h3>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {match.lostObject.location}, {match.lostObject.city}
              </p>
              <p className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatRelativeTime(match.lostObject.dateLost)}
              </p>
            </div>
          </div>

          {/* Match Score */}
          <div className="flex flex-col items-center justify-center gap-2 sm:w-24">
            <div className={`
              flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold
              ${match.matchScore >= 80 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                match.matchScore >= 60 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                "bg-muted text-muted-foreground"}
            `}>
              {match.matchScore}%
            </div>
            <span className="text-[10px] text-muted-foreground text-center">Score de match</span>
          </div>

          {/* Found Object */}
          <div className="flex-1 p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20">
            <Badge variant="success" className="text-[10px] mb-2">Trouvé</Badge>
            <h3 className="font-semibold text-sm mb-1">{match.foundObject.title}</h3>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {match.foundObject.location}, {match.foundObject.city}
              </p>
              <p className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatRelativeTime(match.foundObject.dateFound)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">
                {match.user.name.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{match.user.name}</span>
          </div>
          <div className="flex gap-2">
            {match.status === "PENDING" ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => onReject(match.id)}
                  disabled={isLoading}
                >
                  <XCircle className="h-3 w-3" /> Refuser
                </Button>
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => onConfirm(match.id)}
                  disabled={isLoading}
                >
                  <CheckCircle2 className="h-3 w-3" /> Accepter
                </Button>
              </>
            ) : (
              <Button size="sm" className="gap-1" asChild>
                <Link href="/messages">
                  <MessageCircle className="h-3 w-3" /> Contacter
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
