"use client";

import Link from "next/link";
import { Trophy, ArrowLeft, Crown, Medal, Star, TrendingUp } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockUsers } from "@/lib/data";

const leaderboardData = mockUsers
  .sort((a, b) => b.trustScore - a.trustScore)
  .map((user, index) => ({ ...user, rank: index + 1 }));

export default function LeaderboardPage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Classement
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Les meilleurs contributeurs de la communauté RetrouvIt.
          </p>
        </div>

        {/* Top 3 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {leaderboardData.slice(0, 3).map((user, index) => {
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <Card key={user.id} className={index === 0 ? "border-amber-200 dark:border-amber-800" : ""}>
                <CardContent className="p-4 text-center">
                  <span className="text-2xl">{medals[index]}</span>
                  <Avatar className="h-12 w-12 mx-auto mt-2 mb-2">
                    <AvatarFallback>
                      {user.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.trustScore}%</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {user.objectsFound} objets retournés
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Full List */}
        <Card>
          <CardContent className="p-0">
            {leaderboardData.map((user) => (
              <div key={user.id} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                <span className="text-sm font-bold text-muted-foreground w-6 text-center">
                  #{user.rank}
                </span>
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {user.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.objectsFound} objets retournés · {user.matches} matches
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{user.trustScore}%</p>
                  <Progress value={user.trustScore} className="h-1 w-16 mt-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
