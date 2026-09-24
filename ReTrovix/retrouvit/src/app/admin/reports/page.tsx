"use client";

import * as React from "react";
import {
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Shield,
  RefreshCw,
  Download,
  Filter,
  FileText,
  Flag,
  Ban,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { AuthGuard } from "@/components/auth-guard";
import { reportsApi, type ReportResponse } from "@/lib/api-admin";
import { formatDate } from "@/lib/utils";

type ReportStatus = "PENDING" | "IN_REVIEW" | "RESOLVED" | "DISMISSED" | "ESCALATED";
type ReportType = "FRAUD" | "SCAM" | "FAKE_LISTING" | "HARASSMENT" | "PAYMENT_DISPUTE" | "IDENTITY" | "OTHER";

const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
  PENDING: { label: "En attente", variant: "warning", icon: Clock },
  IN_REVIEW: { label: "En revue", variant: "secondary", icon: Eye },
  RESOLVED: { label: "Résolue", variant: "success", icon: CheckCircle2 },
  DISMISSED: { label: "Rejetée", variant: "secondary", icon: XCircle },
  ESCALATED: { label: "Escaladée", variant: "destructive", icon: ArrowUpRight },
};

const typeConfig: Record<string, { label: string; icon: any }> = {
  FRAUD: { label: "Fraude", icon: AlertTriangle },
  SCAM: { label: "Arnaque", icon: Ban },
  FAKE_LISTING: { label: "Fausse annonce", icon: Flag },
  HARASSMENT: { label: "Harcèlement", icon: Shield },
  PAYMENT_DISPUTE: { label: "Litige paiement", icon: FileText },
  IDENTITY: { label: "Usurpation d'identité", icon: Shield },
  OTHER: { label: "Autre", icon: Flag },
};

function ReportsContent() {
  const [reports, setReports] = React.useState<ReportResponse[]>([]);
  const [stats, setStats] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [selectedReport, setSelectedReport] = React.useState<ReportResponse | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = React.useState(false);
  const [dismissDialogOpen, setDismissDialogOpen] = React.useState(false);
  const [resolveNote, setResolveNote] = React.useState("");
  const [dismissReason, setDismissReason] = React.useState("");
  const [processing, setProcessing] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [reportsData, statsData] = await Promise.all([
        reportsApi.getAll(),
        reportsApi.getStats(),
      ]);
      setReports(reportsData);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResolve = async () => {
    if (!selectedReport || !resolveNote.trim()) return;
    try {
      setProcessing(true);
      await reportsApi.resolve(selectedReport.id, resolveNote);
      setResolveDialogOpen(false);
      setSelectedReport(null);
      setResolveNote("");
      await fetchData();
    } catch (err) {
      console.error("Resolve failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDismiss = async () => {
    if (!selectedReport || !dismissReason.trim()) return;
    try {
      setProcessing(true);
      await reportsApi.dismiss(selectedReport.id, dismissReason);
      setDismissDialogOpen(false);
      setSelectedReport(null);
      setDismissReason("");
      await fetchData();
    } catch (err) {
      console.error("Dismiss failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleEscalate = async (report: ReportResponse) => {
    try {
      await reportsApi.escalate(report.id);
      await fetchData();
    } catch (err) {
      console.error("Escalate failed:", err);
    }
  };

  const filtered = reports.filter((r) => {
    const matchesSearch =
      r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reporter?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesType = typeFilter === "all" || r.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const counts = {
    all: reports.length,
    PENDING: reports.filter((r) => r.status === "PENDING").length,
    IN_REVIEW: reports.filter((r) => r.status === "IN_REVIEW").length,
    RESOLVED: reports.filter((r) => r.status === "RESOLVED").length,
    ESCALATED: reports.filter((r) => r.status === "ESCALATED").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Signalements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.all} signalements au total · {counts.PENDING} en attente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold">{counts.all}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{counts.PENDING}</div>
                <div className="text-xs text-muted-foreground">En attente</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{counts.IN_REVIEW}</div>
                <div className="text-xs text-muted-foreground">En revue</div>
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
                <div className="text-2xl font-bold">{counts.RESOLVED}</div>
                <div className="text-xs text-muted-foreground">Résolues</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{counts.ESCALATED}</div>
                <div className="text-xs text-muted-foreground">Escaladées</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par sujet, description, utilisateur..."
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
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="IN_REVIEW">En revue</SelectItem>
            <SelectItem value="RESOLVED">Résolues</SelectItem>
            <SelectItem value="DISMISSED">Rejetées</SelectItem>
            <SelectItem value="ESCALATED">Escaladées</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="FRAUD">Fraude</SelectItem>
            <SelectItem value="SCAM">Arnaque</SelectItem>
            <SelectItem value="FAKE_LISTING">Fausse annonce</SelectItem>
            <SelectItem value="HARASSMENT">Harcèlement</SelectItem>
            <SelectItem value="PAYMENT_DISPUTE">Litige paiement</SelectItem>
            <SelectItem value="IDENTITY">Usurpation d&apos;identité</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">Tous ({counts.all})</TabsTrigger>
          <TabsTrigger value="PENDING">En attente ({counts.PENDING})</TabsTrigger>
          <TabsTrigger value="IN_REVIEW">En revue ({counts.IN_REVIEW})</TabsTrigger>
          <TabsTrigger value="RESOLVED">Résolues ({counts.RESOLVED})</TabsTrigger>
          <TabsTrigger value="ESCALATED">Escaladées ({counts.ESCALATED})</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Signalement</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Plaignant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Aucun signalement trouvé
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((report) => {
                      const statusInfo = statusConfig[report.status] || statusConfig.PENDING;
                      const typeInfo = typeConfig[report.type] || typeConfig.OTHER;
                      const StatusIcon = statusInfo.icon;
                      const TypeIcon = typeInfo.icon;
                      return (
                        <TableRow
                          key={report.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedReport(report)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium line-clamp-1 max-w-[250px]">
                                  {report.subject}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  #{report.id}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {typeInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant} className="text-[10px] gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">
                                  {report.reporter?.name?.split(" ").map((n) => n[0]).join("") || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{report.reporter?.name || "N/A"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(report.createdAt)}
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
                                    setSelectedReport(report);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir détails
                                </DropdownMenuItem>
                                {report.status === "PENDING" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedReport(report);
                                        setResolveDialogOpen(true);
                                      }}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                                      Résoudre
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedReport(report);
                                        setDismissDialogOpen(true);
                                      }}
                                      className="text-destructive"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Rejeter
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {report.status === "IN_REVIEW" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEscalate(report);
                                      }}
                                    >
                                      <ArrowUpRight className="h-4 w-4 mr-2" />
                                      Escalader
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedReport(report);
                                        setResolveDialogOpen(true);
                                      }}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
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
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  {(() => {
                    const TypeIcon = typeConfig[selectedReport.type]?.icon || Flag;
                    return <TypeIcon className="h-5 w-5 text-muted-foreground" />;
                  })()}
                  <div>
                    <DialogTitle className="text-base">
                      {selectedReport.subject}
                    </DialogTitle>
                    <DialogDescription>
                      #{selectedReport.id} · {typeConfig[selectedReport.type]?.label || selectedReport.type} ·{" "}
                      {formatDate(selectedReport.createdAt)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-3">
                  <Badge variant={statusConfig[selectedReport.status]?.variant || "secondary"}>
                    {statusConfig[selectedReport.status]?.label || selectedReport.status}
                  </Badge>
                  {selectedReport.amount && (
                    <Badge variant="outline">
                      {selectedReport.amount.toLocaleString()} FCFA
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedReport.description}
                    </p>
                  </CardContent>
                </Card>

                {/* Reporter */}
                {selectedReport.reporter && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                        Plaignant
                      </h4>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-xs">
                            {selectedReport.reporter.name?.split(" ").map((n) => n[0]).join("") || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{selectedReport.reporter.name}</p>
                          <p className="text-xs text-muted-foreground">{selectedReport.reporter.email}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Resolution */}
                {selectedReport.resolution && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-2">Résolution</h4>
                      <p className="text-sm text-muted-foreground">{selectedReport.resolution}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelectedReport(null)}>
                  Fermer
                </Button>
                {selectedReport.status === "PENDING" && (
                  <>
                    <Button
                      variant="outline"
                      className="text-destructive"
                      onClick={() => {
                        setDismissDialogOpen(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rejeter
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        setResolveDialogOpen(true);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Résoudre
                    </Button>
                  </>
                )}
                {selectedReport.status === "IN_REVIEW" && (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      setResolveDialogOpen(true);
                    }}
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

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Résoudre le signalement
            </DialogTitle>
            <DialogDescription>
              Décrivez l&apos;action prise et la résolution.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Décrivez la résolution..."
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleResolve}
              disabled={processing || !resolveNote.trim()}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Résoudre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss Dialog */}
      <Dialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Rejeter le signalement
            </DialogTitle>
            <DialogDescription>
              Indiquez la raison du rejet.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Raison du rejet..."
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDismiss}
              disabled={processing || !dismissReason.trim()}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <AuthGuard requireAdmin>
      <ReportsContent />
    </AuthGuard>
  );
}
