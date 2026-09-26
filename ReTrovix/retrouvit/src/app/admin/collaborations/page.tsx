"use client";

import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  adminCollaborationsApi,
  type ReturnRequestResponse,
  type CollaborationDetail,
} from "@/lib/api-returns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Eye,
  FileSearch,
  Loader2,
  RefreshCw,
  Search,
  Users,
  History,
  Wallet,
  MessageCircle,
  ShieldCheck,
  MapPin,
  Navigation,
  ExternalLink,
} from "lucide-react";

/**
 * §24 : Vue administrateur des collaborations de restitution.
 *
 * L'administrateur ouvre une collaboration et voit **toute sa timeline** :
 * correspondance, vérification, demande, acceptation, proposition,
 * paiement, mission, confirmations, libération des fonds, avis, litige...
 */

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  MATCH_FOUND: { label: "Correspondance", variant: "secondary" },
  VERIFICATION_PENDING: { label: "Vérification", variant: "secondary" },
  VERIFIED: { label: "Vérifiée", variant: "secondary" },
  CONNECTION_PENDING: { label: "Mise en relation", variant: "secondary" },
  CHAT_ACTIVE: { label: "Discussion", variant: "secondary" },
  PROPOSAL_PENDING: { label: "Proposition", variant: "warning" },
  PAYMENT_PENDING: { label: "Paiement attendu", variant: "warning" },
  ESCROW_FUNDED: { label: "Séquestre", variant: "warning" },
  MISSION_READY: { label: "Mission prête", variant: "warning" },
  MISSION_STARTED: { label: "Mission démarrée", variant: "warning" },
  MEETING_IN_PROGRESS: { label: "Rendez-vous", variant: "warning" },
  HANDOVER_PENDING: { label: "Confirmation", variant: "warning" },
  COMPLETED: { label: "Terminé", variant: "success" },
  REJECTED: { label: "Refusé", variant: "destructive" },
  PAYMENT_FAILED: { label: "Paiement échoué", variant: "destructive" },
  DISPUTED: { label: "Litige", variant: "destructive" },
  UNDER_REVIEW: { label: "En revue", variant: "destructive" },
  RESOLVED: { label: "Résolu", variant: "default" },
  REFUNDED: { label: "Remboursé", variant: "default" },
  CANCELLED: { label: "Annulé", variant: "destructive" },
};

const STATUS_FILTERS = [
  { value: "", label: "Tous" },
  { value: "DISPUTED", label: "Litiges" },
  { value: "UNDER_REVIEW", label: "En revue" },
  { value: "ESCROW_FUNDED", label: "Séquestre actif" },
  { value: "MISSION_STARTED", label: "Missions en cours" },
  { value: "COMPLETED", label: "Terminés" },
];

const ESCROW_STATUS_LABELS: Record<string, string> = {
  AWAITING_RETURN: "En attente de restitution",
  LOCKED: "Verrouillé (mission en cours)",
  RETURN_CONFIRMED: "Retour confirmé",
  RELEASED: "Libéré au Finder",
  REFUNDED: "Remboursé au Chercheur",
  DISPUTED: "Gelé (litige)",
  COMPLETED: "Terminé",
};

const PROOF_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  SUBMITTED: { label: "Soumise", variant: "warning" },
  APPROVED: { label: "Approuvée", variant: "success" },
  REJECTED: { label: "Rejetée", variant: "destructive" },
  NEED_MORE_INFO: { label: "Info supplémentaire", variant: "secondary" },
};

function formatCurrency(n?: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-CM").format(n) + " XAF";
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-CM", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export default function AdminCollaborationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [collabs, setCollabs] = React.useState<ReturnRequestResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);
  const [detail, setDetail] = React.useState<CollaborationDetail | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);

  // Redirect if not admin
  React.useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.push("/feed");
    }
  }, [user, router]);

  const fetchCollabs = React.useCallback(async () => {
    try {
      const data = await adminCollaborationsApi.getAll(statusFilter || undefined);
      setCollabs(data);
    } catch (err) {
      console.error("Failed to fetch collaborations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    fetchCollabs();
  }, [fetchCollabs]);

  const openDetail = async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await adminCollaborationsApi.getDetail(id);
      setDetail(data);
    } catch (err) {
      console.error("Failed to fetch collaboration detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = collabs.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.reference.toLowerCase().includes(q) ||
      c.loser.name.toLowerCase().includes(q) ||
      c.finder.name.toLowerCase().includes(q) ||
      (c.lostObjectTitle ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collaborations</h1>
          <p className="text-sm text-muted-foreground">
            Vue complète des restitutions — machine d'états et timeline d'audit (§24)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRefreshing(true);
            fetchCollabs();
          }}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Référence, utilisateur, objet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileSearch className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Aucune collaboration trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Chercheur</TableHead>
                  <TableHead>Finder</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.reference}</TableCell>
                    <TableCell className="max-w-40 truncate">
                      {c.lostObjectTitle ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.loser.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.finder.name}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(c.acceptedAmount ?? c.proposedAmount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(c.id)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Timeline
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog — §24 : toute la timeline */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Collaboration {detail?.collaboration.reference}
            </DialogTitle>
            <DialogDescription>
              Timeline complète et onglets d'audit de la collaboration
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary (au-dessus des onglets) */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Objet</p>
                  <p className="font-medium">
                    {detail.collaboration.lostObjectTitle ?? "—"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Statut</p>
                  <StatusBadge status={detail.collaboration.status} />
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Chercheur</p>
                  <p className="font-medium">{detail.collaboration.loser.name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Finder</p>
                  <p className="font-medium">{detail.collaboration.finder.name}</p>
                </div>
              </div>

              {/* §24 : Onglets Paiement | Localisation | Messages | Preuves | Historique */}
              <Tabs defaultValue="timeline">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="timeline" className="text-xs px-1">
                    <History className="h-3.5 w-3.5 mr-1" /> Historique
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="text-xs px-1">
                    <Wallet className="h-3.5 w-3.5 mr-1" /> Paiement
                  </TabsTrigger>
                  <TabsTrigger value="location" className="text-xs px-1">
                    <MapPin className="h-3.5 w-3.5 mr-1" /> Localisation
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="text-xs px-1">
                    <MessageCircle className="h-3.5 w-3.5 mr-1" /> Messages
                  </TabsTrigger>
                  <TabsTrigger value="proofs" className="text-xs px-1">
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Preuves
                  </TabsTrigger>
                </TabsList>

                {/* ─── Onglet Historique (timeline d'audit) ─── */}
                <TabsContent value="timeline" className="space-y-3 pt-2">
                  {detail.timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun événement</p>
                  ) : (
                    <div className="relative border-l ml-3 space-y-3 pl-4 py-1">
                      {detail.timeline.map((e) => (
                        <div key={e.id} className="relative">
                          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                          <p className="text-sm">{e.description ?? e.eventType}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(e.createdAt)} — {e.actorName}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ─── Onglet Paiement (escrow) ─── */}
                <TabsContent value="payment" className="space-y-3 pt-2">
                  {/* Montants de la collaboration */}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Montant accepté</p>
                      <p className="font-medium">
                        {formatCurrency(detail.collaboration.acceptedAmount)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Frais plateforme</p>
                      <p className="font-medium">
                        {formatCurrency(detail.collaboration.platformFee)}
                        {detail.collaboration.platformFeePct != null &&
                          ` (${detail.collaboration.platformFeePct} %)`}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Versé au Finder</p>
                      <p className="font-medium">
                        {formatCurrency(detail.collaboration.paymentAmount)}
                      </p>
                    </div>
                  </div>

                  {detail.escrow ? (
                    <div className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Séquestre <span className="font-mono">{detail.escrow.reference}</span>
                        </p>
                        <Badge variant="secondary">
                          {ESCROW_STATUS_LABELS[detail.escrow.status ?? ""] ?? detail.escrow.status}
                        </Badge>
                      </div>
                      <p>Montant bloqué : {formatCurrency(detail.escrow.amount)}</p>
                      {detail.escrow.location && (
                        <p className="text-muted-foreground">📍 {detail.escrow.location}</p>
                      )}
                      {detail.escrow.deadline && (
                        <p className="text-muted-foreground">
                          Deadline : {formatDate(detail.escrow.deadline)}
                        </p>
                      )}
                      {detail.escrow.completedAt && (
                        <p className="text-muted-foreground">
                          Clôturé : {formatDate(detail.escrow.completedAt)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucun séquestre — le paiement n'a pas encore été sécurisé.
                    </p>
                  )}
                </TabsContent>

                {/* ─── Onglet Localisation (§13) ─── */}
                <TabsContent value="location" className="space-y-3 pt-2">
                  {detail.locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune position partagée — le partage n'est actif que pendant la mission.
                    </p>
                  ) : (
                    detail.locations.map((loc) => (
                      <div key={loc.userId} className="p-3 rounded-lg bg-muted/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Navigation className="h-4 w-4 text-primary" />
                            {loc.userName}
                          </p>
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=15/${loc.latitude}/${loc.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                          >
                            Carte <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                          {loc.accuracyMeters != null && ` — précision ±${Math.round(loc.accuracyMeters)} m`}
                          {" — "}mise à jour {formatDate(loc.updatedAt)}
                        </p>
                      </div>
                    ))
                  )}
                  <p className="text-xs text-muted-foreground">
                    🔒 Les positions sont purgées automatiquement à la fin de la collaboration (§20).
                  </p>
                </TabsContent>

                {/* ─── Onglet Messages (§5 : conservés pour arbitrage) ─── */}
                <TabsContent value="messages" className="space-y-2 pt-2 max-h-80 overflow-y-auto">
                  {detail.messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune conversation liée entre ces deux utilisateurs.
                    </p>
                  ) : (
                    detail.messages.map((m) => (
                      <div key={m.id} className="p-2.5 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium">{m.senderName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(m.createdAt)}
                          </p>
                        </div>
                        {m.deleted ? (
                          <p className="text-xs italic text-muted-foreground">(message supprimé)</p>
                        ) : (
                          <>
                            {m.content && <p className="text-sm whitespace-pre-line">{m.content}</p>}
                            {m.imageUrl && (
                              <img
                                src={m.imageUrl.startsWith("http") ? m.imageUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${m.imageUrl}`}
                                alt="Pièce jointe"
                                className="max-w-full max-h-40 object-cover rounded-md mt-1"
                              />
                            )}
                          </>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* ─── Onglet Preuves (§2 : vérification de propriété) ─── */}
                <TabsContent value="proofs" className="space-y-3 pt-2">
                  {detail.proofs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune preuve soumise pour cette collaboration.
                    </p>
                  ) : (
                    detail.proofs.map((p) => {
                      const cfg = PROOF_STATUS_LABELS[p.status ?? ""] ?? {
                        label: p.status,
                        variant: "secondary" as const,
                      };
                      return (
                        <div key={p.id} className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">Preuve de {p.submittedByName}</p>
                            <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          </div>
                          {p.description && <p>{p.description}</p>}
                          {p.characteristics && (
                            <p className="text-muted-foreground">Caractéristiques : {p.characteristics}</p>
                          )}
                          {p.condition && (
                            <p className="text-muted-foreground">État : {p.condition}</p>
                          )}
                          {p.discoveryLocation && (
                            <p className="text-muted-foreground">📍 Découverte : {p.discoveryLocation}</p>
                          )}
                          {p.serialNumber && (
                            <p className="text-muted-foreground font-mono text-xs">N° série : {p.serialNumber}</p>
                          )}
                          {p.reviewNote && (
                            <p className="text-xs text-muted-foreground">Note de revue : {p.reviewNote}</p>
                          )}
                          {p.photos && (
                            <div className="flex gap-2 flex-wrap">
                              {p.photos.split(",").filter(Boolean).map((url, i) => (
                                <img
                                  key={i}
                                  src={url.trim().startsWith("http") ? url.trim() : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${url.trim()}`}
                                  alt={`Preuve ${i + 1}`}
                                  className="h-20 w-20 object-cover rounded-md"
                                />
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Soumise le {formatDate(p.createdAt)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
