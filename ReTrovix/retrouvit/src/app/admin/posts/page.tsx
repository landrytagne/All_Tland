"use client";

import * as React from "react";
import { Search, Eye, Trash2, CheckCircle2, XCircle, MoreHorizontal, Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { mockLostObjects, mockFoundObjects } from "@/lib/data";
import { formatDate } from "@/lib/utils";

const allPosts = [
  ...mockLostObjects.map((o) => ({ ...o, type: "lost" as const })),
  ...mockFoundObjects.map((o) => ({ ...o, type: "found" as const })),
];

export default function AdminPostsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Publications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Modérez les publications de la plateforme.
          </p>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Toutes ({allPosts.length})</TabsTrigger>
          <TabsTrigger value="active">Actives ({allPosts.filter(p => p.status === "active").length})</TabsTrigger>
          <TabsTrigger value="flagged">Signalées (1)</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Objet</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <p className="text-sm font-medium line-clamp-1 max-w-[200px]">{post.title}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.type === "lost" ? "destructive" : "success"} className="text-[10px]">
                          {post.type === "lost" ? "Perdu" : "Trouvé"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{post.category}</TableCell>
                      <TableCell>
                        <Badge variant={post.status === "active" ? "success" : "secondary"} className="text-[10px]">
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{post.user.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate("dateLost" in post ? post.dateLost : ("dateFound" in post ? post.dateFound : ""))}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" /> Voir
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <p className="text-sm text-muted-foreground">
            {allPosts.filter(p => p.status === "active").length} publications actives.
          </p>
        </TabsContent>

        <TabsContent value="flagged" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Flag className="h-4 w-4 text-amber-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Annonce suspecte #2341</p>
                  <p className="text-xs text-muted-foreground">Signalé par le système automatique</p>
                </div>
                <Button variant="outline" size="sm">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Approuver
                </Button>
                <Button variant="destructive" size="sm">
                  <XCircle className="h-3 w-3 mr-1" /> Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
