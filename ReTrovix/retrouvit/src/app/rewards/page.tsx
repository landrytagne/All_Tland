"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Gift,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Star,
  Trophy,
  Medal,
  Award,
  Sparkles,
  Target,
  CheckCircle2,
  Clock,
  Calendar,
  Wallet,
  ArrowRight,
  Crown,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCard } from "@/components/stats-card";
import { formatDate, formatCurrency } from "@/lib/utils";

const rewardStats = {
  totalEarned: 135000,
  thisMonth: 25000,
  averageReward: 16875,
  bestReward: 50000,
};

const earnedRewards = [
  {
    id: "RW-001",
    objectTitle: "iPhone 15 Pro Max — Noir Titane",
    amount: 25000,
    earnedFrom: "Marie Ngono",
    date: "2025-08-17T12:00:00Z",
    category: "Électronique",
    status: "received",
  },
  {
    id: "RW-002",
    objectTitle: "Portefeuille cuir avec documents",
    amount: 30000,
    earnedFrom: "Sophie Biya",
    date: "2025-08-10T16:00:00Z",
    category: "Documents",
    status: "received",
  },
  {
    id: "RW-003",
    objectTitle: "Sac à dos Samsonite gris",
    amount: 50000,
    earnedFrom: "Jean Kamga",
    date: "2025-08-05T12:00:00Z",
    category: "Sacs & Bagages",
    status: "received",
  },
  {
    id: "RW-004",
    objectTitle: "Clés de voiture BMW",
    amount: 10000,
    earnedFrom: "Paul Fouda",
    date: "2025-07-28T09:00:00Z",
    category: "Clés",
    status: "pending",
  },
  {
    id: "RW-005",
    objectTitle: "Laptop Dell — Silver",
    amount: 20000,
    earnedFrom: "Landry Tagne",
    date: "2025-07-20T14:00:00Z",
    category: "Électronique",
    status: "received",
  },
];

const leaderboard = [
  { rank: 1, name: "Sophie Biya", rewards: 150000, objectsFound: 15, badge: "🏆" },
  { rank: 2, name: "Landry Tagne", rewards: 135000, objectsFound: 12, badge: "🥈" },
  { rank: 3, name: "Marie Ngono", rewards: 88000, objectsFound: 5, badge: "🥉" },
  { rank: 4, name: "Jean Kamga", rewards: 82000, objectsFound: 7, badge: "" },
  { rank: 5, name: "Paul Fouda", rewards: 75000, objectsFound: 8, badge: "" },
];

const monthlyGoals = [
  { label: "Objets retournés", current: 3, target: 5 },
  { label: "Récompenses gagnées", current: 25000, target: 50000 },
  { label: "Score confiance maintenu", current: 92, target: 95 },
];

export default function RewardsPage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gift className="h-6 w-6" />
              Mes récompenses
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Suivez vos gains et progression dans le classement.
            </p>
          </div>
          <Button asChild>
            <Link href="/wallet">
              <Wallet className="h-4 w-4 mr-2" />
              Mon portefeuille
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
          <StatsCard
            title="Total gagné"
            value={formatCurrency(rewardStats.totalEarned)}
            icon={TrendingUp}
            change={`+${formatCurrency(rewardStats.thisMonth)} ce mois`}
            changeType="positive"
          />
          <StatsCard
            title="Récompense moyenne"
            value={formatCurrency(rewardStats.averageReward)}
            icon={Target}
            description="Par objet retourné"
          />
          <StatsCard
            title="Meilleure récompense"
            value={formatCurrency(rewardStats.bestReward)}
            icon={Trophy}
            description="Sac à dos Samsonite"
          />
          <StatsCard
            title="Rang actuel"
            value="#2"
            icon={Medal}
            change="Top 10%"
            changeType="positive"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="earned">
              <TabsList>
                <TabsTrigger value="earned">
                  Récompenses ({earnedRewards.length})
                </TabsTrigger>
                <TabsTrigger value="leaderboard">
                  Classement
                </TabsTrigger>
              </TabsList>

              {/* Earned rewards */}
              <TabsContent value="earned" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    {earnedRewards.map((reward, i) => (
                      <div
                        key={reward.id}
                        className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                            <Gift className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{reward.objectTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              De {reward.earnedFrom} · {formatDate(reward.date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={reward.status === "received" ? "success" : "warning"} className="text-[10px]">
                            {reward.status === "received" ? "Reçue" : "En cours"}
                          </Badge>
                          <span className="text-sm font-bold text-emerald-600">
                            +{formatCurrency(reward.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Leaderboard */}
              <TabsContent value="leaderboard" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Top retrouveurs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {leaderboard.map((entry) => (
                      <div
                        key={entry.rank}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          entry.name === "Landry Tagne"
                            ? "bg-primary/5 border border-primary/20"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="w-8 text-center">
                          {entry.badge ? (
                            <span className="text-xl">{entry.badge}</span>
                          ) : (
                            <span className="text-sm font-bold text-muted-foreground">
                              #{entry.rank}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium">{entry.name}</p>
                            {entry.name === "Landry Tagne" && (
                              <Badge variant="default" className="text-[9px] px-1">Vous</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {entry.objectsFound} objets retournés
                          </p>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatCurrency(entry.rewards)}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Monthly goals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Objectifs du mois
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {monthlyGoals.map((goal) => (
                  <div key={goal.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{goal.label}</span>
                      <span className="font-medium">
                        {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
                      </span>
                    </div>
                    <Progress
                      value={(goal.current / goal.target) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Your rank card */}
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-800">
              <CardContent className="p-5 text-center">
                <Crown className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  Rang #2 sur 45 230
                </p>
                <p className="text-xs text-amber-500/70 dark:text-amber-400/60 mt-1">
                  Vous êtes dans le top 1% des retrouveurs !
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <Link href="/leaderboard">
                    <Trophy className="h-3.5 w-3.5 mr-1" />
                    Voir le classement
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Augmentez vos gains
                </h3>
                <div className="space-y-3 text-sm">
                  {[
                    { icon: CheckCircle2, text: "Retournez des objets pour gagner des récompenses" },
                    { icon: Star, text: "Maintenez un score de confiance élevé" },
                    { icon: Award, text: "Devenez un « Super retrouveur » pour des bonus" },
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <tip.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{tip.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
