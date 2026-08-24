"use client";

import { useState } from "react";
import {
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageCircle,
  Clock,
  Shield,
  MoreHorizontal,
  ArrowUpRight,
  Ban,
  UserX,
  CreditCard,
  Package,
  RefreshCw,
  Download,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  FileText,
  Flag,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

type ComplaintStatus = "pending" | "in_review" | "resolved" | "dismissed" | "escalated";
type ComplaintType = "fraud" | "scam" | "fake_listing" | "harassment" | "payment_dispute" | "identity" | "other";

interface Complaint {
  id: string;
  type: ComplaintType;
  status: ComplaintStatus;
  subject: string;
  description: string;
  reporter: {
    name: string;
    email: string;
    trustScore: number;
  };
  reported: {
    name: string;
    email: string;
    trustScore: number;
  };
  relatedPost?: string;
  relatedTransaction?: string;
  amount?: number;
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  updatedAt: string;
  timeline: {
    action: string;
    detail: string;
    time: string;
    by: string;
  }[];
  evidence: string[];
}

const complaints: Complaint[] = [
  {
    id: "CMP-4501",
    type: "fraud",
    status: "pending",
    subject: "Objet jamais retourné malgré récompense payée",
    description:
      "J'ai payé 25 000 FCFA de récompense pour le retour de mon téléphone via escrow. La personne prétend l'avoir envoyé mais je n'ai jamais rien reçu. Elle refuse de répondre à mes messages depuis 3 jours.",
    reporter: {
      name: "Marie Ngono",
      email: "marie@example.com",
      trustScore: 88,
    },
    reported: {
      name: "Paul Fouda",
      email: "paul@example.com",
      trustScore: 75,
    },
    relatedPost: "P-1845",
    relatedTransaction: "T-8801",
    amount: 25000,
    priority: "high",
    createdAt: "2025-08-18T14:30:00",
    updatedAt: "2025-08-19T09:15:00",
    timeline: [
      { action: "Réclamation créée", detail: "Marie Ngono a ouvert une réclamation", time: "18 Août 14:30", by: "Marie Ngono" },
      { action: "Assignée à un agent", detail: "Assignée à l'équipe support", time: "18 Août 15:00", by: "Système" },
      { action: "Notification envoyée", detail: "Paul Fouda a été notifié", time: "18 Août 15:01", by: "Système" },
    ],
    evidence: ["Screenshot conversation", "Preuve de paiement escrow"],
  },
  {
    id: "CMP-4500",
    type: "payment_dispute",
    status: "in_review",
    subject: "Double débit sur retrait Mobile Money",
    description:
      "J'ai effectué un retrait de 30 000 FCFA mais mon compte Mobile Money a été débité deux fois (60 000 FCFA au total). Mon solde Wallet indique toujours le montant original.",
    reporter: {
      name: "Sophie Biya",
      email: "sophie@example.com",
      trustScore: 95,
    },
    reported: {
      name: "RetrouvIt Système",
      email: "system@retrouvit.com",
      trustScore: 100,
    },
    relatedTransaction: "T-8845",
    amount: 30000,
    priority: "critical",
    createdAt: "2025-08-17T10:00:00",
    updatedAt: "2025-08-19T11:30:00",
    timeline: [
      { action: "Réclamation créée", detail: "Signalement double débit", time: "17 Août 10:00", by: "Sophie Biya" },
      { action: "En revue", detail: "L'équipe finance examine les logs", time: "17 Août 14:00", by: "Agent Support" },
      { action: "Vérification bancaire", detail: "En attente retour partenaire Mobile Money", time: "18 Août 09:00", by: "Agent Finance" },
      { action: "Mise à jour", detail: "Partenaire confirmé — remboursement en cours", time: "19 Août 11:30", by: "Agent Finance" },
    ],
    evidence: ["Reçu Mobile Money", "Screenshot solde Wallet"],
  },
  {
    id: "CMP-4499",
    type: "fake_listing",
    status: "resolved",
    subject: "Annonce frauduleuse — iPhone à prix anormalement bas",
    description:
      "Une annonce propose un iPhone 15 Pro Max à 50 000 FCFA, ce qui est bien en dessous du prix du marché. L'utilisateur a un score de confiance de 30% et n'a jamais fait de transaction.",
    reporter: {
      name: "Système AutoMod",
      email: "automod@retrouvit.com",
      trustScore: 100,
    },
    reported: {
      name: "Jean Mvondo",
      email: "jean.mvondo@example.com",
      trustScore: 30,
    },
    relatedPost: "P-1890",
    priority: "medium",
    createdAt: "2025-08-16T08:00:00",
    updatedAt: "2025-08-16T16:00:00",
    timeline: [
      { action: "Détection auto", detail: "Annonce flaguée par le système Anti-Fraude", time: "16 Août 08:00", by: "AutoMod" },
      { action: "En revue", detail: "Vérification manuelle", time: "16 Août 09:30", by: "Agent Support" },
      { action: "Résolue", detail: "Annonce supprimée, compte averti", time: "16 Août 16:00", by: "Agent Support" },
    ],
    evidence: ["Détection automatique", "Analyse prix marché"],
  },
  {
    id: "CMP-4498",
    type: "harassment",
    status: "escalated",
    subject: "Harcèlement via messagerie privée",
    description:
      "Un utilisateur m'envoie des messages insistants et menaçants après que j'ai refusé de baisser le prix de récompense. Les messages deviennent agressifs et me font peur.",
    reporter: {
      name: "Cécile Mbida",
      email: "cecile@example.com",
      trustScore: 65,
    },
    reported: {
      name: "Emmanuel Atangana",
      email: "emmanuel@example.com",
      trustScore: 70,
    },
    relatedPost: "P-1830",
    priority: "critical",
    createdAt: "2025-08-15T18:00:00",
    updatedAt: "2025-08-18T10:00:00",
    timeline: [
      { action: "Réclamation créée", detail: "Signalement harcèlement", time: "15 Août 18:00", by: "Cécile Mbida" },
      { action: "Escalade", detail: "Transférée à l'équipe sécurité", time: "16 Août 09:00", by: "Agent Support" },
      { action: "Messages examinés", detail: "12 messages examinés — 5 jugés inappropriés", time: "17 Août 14:00", by: "Agent Sécurité" },
      { action: "En attente décision", detail: "En attente validation direction", time: "18 Août 10:00", by: "Agent Sécurité" },
    ],
    evidence: ["12 captures d'écran messages", "Signalement automatique"],
  },
  {
    id: "CMP-4497",
    type: "identity",
    status: "pending",
    subject: "Usurpation d'identité — faux profil",
    description:
      "Quelqu'un utilise mes photos et mon nom pour créer un faux profil sur la plateforme. J'ai trouvé ce profil en cherchant mon propre compte.",
    reporter: {
      name: "Landry Tagne",
      email: "landry@retrouvit.com",
      trustScore: 92,
    },
    reported: {
      name: "Profil suspect",
      email: "fake.user@example.com",
      trustScore: 15,
    },
    priority: "high",
    createdAt: "2025-08-19T07:00:00",
    updatedAt: "2025-08-19T07:00:00",
    timeline: [
      { action: "Réclamation créée", detail: "Signalement usurpation d'identité", time: "19 Août 07:00", by: "Landry Tagne" },
    ],
    evidence: ["Comparaison photos profil", "URL du faux profil"],
  },
  {
    id: "CMP-4496",
    type: "scam",
    status: "dismissed",
    subject: "Tentative d'arnaque — paiement hors plateforme",
    description:
      "Un utilisateur m'a proposé de payer en dehors de la plateforme pour éviter les frais. J'ai refusé et signalé le comportement.",
    reporter: {
      name: "Paul Fouda",
      email: "paul@example.com",
      trustScore: 75,
    },
    reported: {
      name: "Utilisateur Anonyme",
      email: "anon@example.com",
      trustScore: 20,
    },
    relatedPost: "P-1812",
    priority: "medium",
    createdAt: "2025-08-14T12:00:00",
    updatedAt: "2025-08-15T10:00:00",
    timeline: [
      { action: "Réclamation créée", detail: "Signalement tentative d'arnaque", time: "14 Août 12:00", by: "Paul Fouda" },
      { action: "Résolue", detail: "Avertissement envoyé — comportement confirmé hors plateforme", time: "15 Août 10:00", by: "Agent Support" },
    ],
    evidence: ["Capture conversation", "Logs système"],
  },
];

function getTypeLabel(type: ComplaintType) {
  const labels: Record<ComplaintType, string> = {
    fraud: "Fraude",
    scam: "Arnaque",
    fake_listing: "Fausse annonce",
    harassment: "Harcèlement",
    payment_dispute: "Litige paiement",
    identity: "Usurpation d'identité",
    other: "Autre",
  };
  return labels[type] || type;
}

function getTypeIcon(type: ComplaintType) {
  switch (type) {
    case "fraud":
    case "scam":
      return AlertTriangle;
    case "payment_dispute":
      return CreditCard;
    case "fake_listing":
      return Package;
    case "harassment":
      return UserX;
    case "identity":
      return Shield;
    default:
      return Flag;
  }
}

function getStatusBadge(status: ComplaintStatus) {
  switch (status) {
    case "pending":
      return <Badge variant="warning">En attente</Badge>;
    case "in_review":
      return <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">En revue</Badge>;
    case "resolved":
      return <Badge variant="success">Résolue</Badge>;
    case "dismissed":
      return <Badge variant="secondary">Rejetée</Badge>;
    case "escalated":
      return <Badge variant="destructive">Escaladée</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "critical":
      return <Badge variant="destructive" className="text-[10px]">Critique</Badge>;
    case "high":
      return <Badge variant="warning" className="text-[10px]">Haute</Badge>;
    case "medium":
      return <Badge variant="secondary" className="text-[10px]">Moyenne</Badge>;
    case "low":
      return <Badge variant="outline" className="text-[10px]">Basse</Badge>;
    default:
      return null;
  }
}

export default function AdminComplaintsPage() {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [resolveNote, setResolveNote] = useState("");

  const filtered = complaints.filter((c) => {
    const matchesSearch =
      c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.reporter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.reported.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const counts = {
    all: complaints.length,
    pending: complaints.filter((c) => c.status === "pending").length,
    in_review: complaints.filter((c) => c.status === "in_review").length,
    escalated: complaints.filter((c) => c.status === "escalated").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Réclamations & Disputes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.all} réclamations au total · {counts.pending} en attente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Exporter
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total", value: counts.all, icon: FileText, color: "text-foreground" },
          { label: "En attente", value: counts.pending, icon: Clock, color: "text-amber-500" },
          { label: "En revue", value: counts.in_review, icon: Eye, color: "text-blue-500" },
          { label: "Escaladées", value: counts.escalated, icon: ArrowUpRight, color: "text-red-500" },
          { label: "Résolues", value: counts.resolved, icon: CheckCircle2, color: "text-emerald-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par ID, sujet, utilisateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="in_review">En revue</SelectItem>
            <SelectItem value="escalated">Escaladées</SelectItem>
            <SelectItem value="resolved">Résolues</SelectItem>
            <SelectItem value="dismissed">Rejetées</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="fraud">Fraude</SelectItem>
            <SelectItem value="scam">Arnaque</SelectItem>
            <SelectItem value="fake_listing">Fausse annonce</SelectItem>
            <SelectItem value="harassment">Harcèlement</SelectItem>
            <SelectItem value="payment_dispute">Litige paiement</SelectItem>
            <SelectItem value="identity">Usurpation d&apos;identité</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Réclamation</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Plaignant</TableHead>
                <TableHead>Signalé</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Shield className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Aucune réclamation trouvée
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((complaint) => {
                  const TypeIcon = getTypeIcon(complaint.type);
                  return (
                    <TableRow
                      key={complaint.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedComplaint(complaint)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium line-clamp-1 max-w-[250px]">
                              {complaint.subject}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {complaint.id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {getTypeLabel(complaint.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{getPriorityBadge(complaint.priority)}</TableCell>
                      <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {complaint.reporter.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{complaint.reporter.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {complaint.reported.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{complaint.reported.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(complaint.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedComplaint(complaint);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            {complaint.status === "pending" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Prendre en charge
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Rejeter
                                </DropdownMenuItem>
                              </>
                            )}
                            {complaint.status === "in_review" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <ArrowUpRight className="h-4 w-4 mr-2" />
                                  Escalader
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Résoudre
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedComplaint}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedComplaint(null);
            setResolveNote("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedComplaint && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  {(() => {
                    const TypeIcon = getTypeIcon(selectedComplaint.type);
                    return <TypeIcon className="h-5 w-5 text-muted-foreground" />;
                  })()}
                  <div>
                    <DialogTitle className="text-base">
                      {selectedComplaint.subject}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedComplaint.id} · {getTypeLabel(selectedComplaint.type)} ·{" "}
                      {formatDate(selectedComplaint.createdAt)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status & Priority */}
                <div className="flex items-center gap-3">
                  {getStatusBadge(selectedComplaint.status)}
                  {getPriorityBadge(selectedComplaint.priority)}
                  {selectedComplaint.amount && (
                    <Badge variant="outline" className="text-[10px]">
                      {selectedComplaint.amount.toLocaleString()} FCFA
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedComplaint.description}
                    </p>
                  </CardContent>
                </Card>

                {/* Parties */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                        Plaignant
                      </h4>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-xs">
                            {selectedComplaint.reporter.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{selectedComplaint.reporter.name}</p>
                          <p className="text-xs text-muted-foreground">{selectedComplaint.reporter.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Score: {selectedComplaint.reporter.trustScore}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                        Signalé
                      </h4>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-xs">
                            {selectedComplaint.reported.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{selectedComplaint.reported.name}</p>
                          <p className="text-xs text-muted-foreground">{selectedComplaint.reported.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Score: {selectedComplaint.reported.trustScore}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Linked items */}
                {(selectedComplaint.relatedPost || selectedComplaint.relatedTransaction) && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-2">Éléments liés</h4>
                      <div className="flex gap-2 flex-wrap">
                        {selectedComplaint.relatedPost && (
                          <Badge variant="outline" className="gap-1">
                            <Package className="h-3 w-3" />
                            {selectedComplaint.relatedPost}
                          </Badge>
                        )}
                        {selectedComplaint.relatedTransaction && (
                          <Badge variant="outline" className="gap-1">
                            <CreditCard className="h-3 w-3" />
                            {selectedComplaint.relatedTransaction}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Evidence */}
                {selectedComplaint.evidence.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-2">Preuves</h4>
                      <div className="space-y-2">
                        {selectedComplaint.evidence.map((ev, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm"
                          >
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{ev}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Timeline */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3">Historique</h4>
                    <div className="space-y-0">
                      {selectedComplaint.timeline.map((event, i) => (
                        <div key={i} className="flex gap-3 relative">
                          <div className="flex flex-col items-center">
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <div className="h-2 w-2 rounded-full bg-primary" />
                            </div>
                            {i < selectedComplaint.timeline.length - 1 && (
                              <div className="w-px flex-1 bg-border" />
                            )}
                          </div>
                          <div className="pb-4 pt-0.5 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{event.action}</p>
                              <span className="text-xs text-muted-foreground">{event.time}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{event.detail}</p>
                            <p className="text-xs text-muted-foreground">par {event.by}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Resolution note */}
                {(selectedComplaint.status === "pending" || selectedComplaint.status === "in_review") && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-2">Note de résolution</h4>
                      <Textarea
                        placeholder="Décrivez l'action prise et la résolution..."
                        value={resolveNote}
                        onChange={(e) => setResolveNote(e.target.value)}
                        rows={3}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
                  Fermer
                </Button>
                {selectedComplaint.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      className="text-destructive"
                      onClick={() => setSelectedComplaint(null)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rejeter
                    </Button>
                    <Button onClick={() => setSelectedComplaint(null)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Prendre en charge
                    </Button>
                  </>
                )}
                {selectedComplaint.status === "in_review" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedComplaint(null)}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      Escalader
                    </Button>
                    <Button
                      onClick={() => setSelectedComplaint(null)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Résoudre
                    </Button>
                  </>
                )}
                {selectedComplaint.status === "escalated" && (
                  <Button
                    onClick={() => setSelectedComplaint(null)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Résoudre
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
