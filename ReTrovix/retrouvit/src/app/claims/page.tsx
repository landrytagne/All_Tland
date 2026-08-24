"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronRight,
  FileText,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const mockClaims = [
  {
    id: "cl1",
    objectTitle: "iPhone 15 Pro Max — Noir Titane",
    type: "lost",
    status: "pending",
    claimer: "Marie Ngono",
    reason: "Je pense avoir trouvé votre téléphone. Il correspond à la description.",
    createdAt: "2025-08-18T10:00:00Z",
  },
  {
    id: "cl2",
    objectTitle: "Portefeuille cuir avec documents",
    type: "lost",
    status: "approved",
    claimer: "Paul Fouda",
    reason: "J'ai récupéré ce portefeuille dans un taxi. Les documents sont intacts.",
    createdAt: "2025-08-17T14:30:00Z",
  },
  {
    id: "cl3",
    objectTitle: "Samsung Galaxy S23 — Bleu",
    type: "found",
    status: "rejected",
    claimer: "Sophie Biya",
    reason: "Ce téléphone est le mien, je peux prouver l'achat.",
    createdAt: "2025-08-16T09:15:00Z",
  },
];

const statusConfig = {
  pending: { label: "En attente", variant: "warning" as const, icon: Clock },
  approved: { label: "Approuvée", variant: "success" as const, icon: CheckCircle2 },
  rejected: { label: "Rejetée", variant: "destructive" as const, icon: XCircle },
};

export default function ClaimsPage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Réclamations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les réclamations sur vos publications.
          </p>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Toutes</TabsTrigger>
            <TabsTrigger value="pending">En attente</TabsTrigger>
            <TabsTrigger value="approved">Approuvées</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 space-y-3">
            {mockClaims.map((claim) => {
              const config = statusConfig[claim.status as keyof typeof statusConfig];
              const StatusIcon = config.icon;
              return (
                <Card key={claim.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold">{claim.objectTitle}</h3>
                          <Badge variant={config.variant} className="text-[10px]">
                            <StatusIcon className="h-2.5 w-2.5 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Réclamé par {claim.claimer}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {claim.reason}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      {claim.status === "pending" && (
                        <>
                          <Button variant="outline" size="sm" className="text-destructive">
                            Rejeter
                          </Button>
                          <Button size="sm">
                            Approuver
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Eye className="h-3 w-3" />
                        Voir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            {mockClaims.filter(c => c.status === "pending").map((claim) => (
              <Card key={claim.id} className="mb-3">
                <CardContent className="p-4">
                  <p className="text-sm font-medium">{claim.objectTitle}</p>
                  <p className="text-xs text-muted-foreground">{claim.claimer}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            {mockClaims.filter(c => c.status === "approved").map((claim) => (
              <Card key={claim.id} className="mb-3">
                <CardContent className="p-4">
                  <p className="text-sm font-medium">{claim.objectTitle}</p>
                  <Badge variant="success" className="text-[10px] mt-1">Approuvée</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
