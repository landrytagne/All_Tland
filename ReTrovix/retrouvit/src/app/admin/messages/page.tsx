"use client";

import * as React from "react";
import {
  MessageCircle,
  Search,
  RefreshCw,
  Loader2,
  MoreHorizontal,
  Eye,
  Trash2,
  Send,
  User,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AuthGuard } from "@/components/auth-guard";
import { formatDate } from "@/lib/utils";

interface MockConversation {
  id: string;
  participants: { name: string; avatar?: string }[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: "active" | "archived";
}

const mockConversations: MockConversation[] = [
  {
    id: "1",
    participants: [{ name: "Marie Ngono" }, { name: "Paul Fouda" }],
    lastMessage: "D'accord, je serai là demain à 14h",
    lastMessageAt: "2025-08-19T14:30:00",
    unreadCount: 2,
    status: "active",
  },
  {
    id: "2",
    participants: [{ name: "Sophie Biya" }, { name: "Jean Mvondo" }],
    lastMessage: "Merci pour le retour !",
    lastMessageAt: "2025-08-19T10:15:00",
    unreadCount: 0,
    status: "active",
  },
  {
    id: "3",
    participants: [{ name: "Landry Tagne" }, { name: "Cécile Mbida" }],
    lastMessage: "L'objet a bien été remis",
    lastMessageAt: "2025-08-18T16:45:00",
    unreadCount: 0,
    status: "archived",
  },
];

function MessagesContent() {
  const [conversations, setConversations] = React.useState<MockConversation[]>(mockConversations);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedConversation, setSelectedConversation] = React.useState<MockConversation | null>(null);
  const [messageText, setMessageText] = React.useState("");

  const filtered = conversations.filter((c) =>
    c.participants.some((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = conversations.filter((c) => c.status === "active").length;
  const archivedCount = conversations.filter((c) => c.status === "archived").length;
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            Messages
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {conversations.length} conversations · {totalUnread} non lus
          </p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conversations.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Actives</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{archivedCount}</p>
                <p className="text-xs text-muted-foreground">Archivées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher une conversation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Conversations Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participants</TableHead>
                <TableHead>Dernier message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <MessageCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "Aucune conversation trouvée" : "Aucune conversation"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((conv) => (
                  <TableRow
                    key={conv.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {conv.participants.slice(0, 2).map((p, i) => (
                            <Avatar key={i} className="h-8 w-8 border-2 border-background">
                              <AvatarFallback className="text-[10px]">
                                {p.name.split(" ").map((n) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {conv.participants.map((p) => p.name).join(" & ")}
                          </p>
                          {conv.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-[10px] mt-1">
                              {conv.unreadCount} non lu(s)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
                        {conv.lastMessage}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(conv.lastMessageAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={conv.status === "active" ? "success" : "secondary"}
                        className="text-[10px]"
                      >
                        {conv.status === "active" ? "Active" : "Archivée"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConversation(conv);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversation
            </DialogTitle>
            <DialogDescription>
              {selectedConversation?.participants.map((p) => p.name).join(" & ")}
            </DialogDescription>
          </DialogHeader>
          {selectedConversation && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {selectedConversation.participants.map((p, i) => (
                    <Avatar key={i} className="h-10 w-10 border-2 border-background">
                      <AvatarFallback className="text-xs">
                        {p.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <div>
                  <p className="font-medium">
                    {selectedConversation.participants.map((p) => p.name).join(" & ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(selectedConversation.lastMessageAt)}
                  </p>
                </div>
              </div>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground italic">
                    &ldquo;{selectedConversation.lastMessage}&rdquo;
                  </p>
                </CardContent>
              </Card>

              <div className="text-center">
                <Badge
                  variant={selectedConversation.status === "active" ? "success" : "secondary"}
                >
                  {selectedConversation.status === "active" ? "Active" : "Archivée"}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminMessagesPage() {
  return (
    <AuthGuard requireAdmin>
      <MessagesContent />
    </AuthGuard>
  );
}
