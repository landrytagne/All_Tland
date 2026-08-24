"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search,
  MoreHorizontal,
  BadgeCheck,
  Ban,
  Eye,
  Shield,
  RefreshCw,
  Loader2,
  AlertCircle,
  Users,
  Download,
  CheckCircle2,
  Trash2,
  ShieldOff,
  UserCheck,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { adminApi, type AdminUser, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { showToast } from "@/lib/toast";

const REFRESH_INTERVAL = 30_000;

import { AuthGuard } from "@/components/auth-guard";

export default function AdminUsersPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminUsersContent />
    </AuthGuard>
  );
}

function AdminUsersContent() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Dialog state
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUsers = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setIsRefreshing(true);
      const data = await adminApi.getUsers();
      setUsers(data);
      setLastRefresh(new Date());
      setError("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("Accès refusé. Vous devez être administrateur.");
      } else if (err instanceof ApiError) {
        setError(`Erreur: ${err.message}`);
      } else {
        setError("Impossible de contacter le serveur.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    intervalRef.current = setInterval(() => fetchUsers(true), REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchUsers]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "admin" && user.role === "ADMIN") ||
      (roleFilter === "user" && user.role === "USER");
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "banned" && user.banned) ||
      (statusFilter === "verified" && user.verified) ||
      (statusFilter === "active" && !user.banned);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleBan = async () => {
    if (!selectedUser) return;
    setActionLoading(selectedUser.id);
    try {
      const updated = await adminApi.banUser(selectedUser.id, banReason);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast({
        title: "Utilisateur banni",
        description: `${updated.name} a été suspendu${banReason ? ` — ${banReason}` : ""}`,
        type: "ADMIN_ALERT",
      });
    } catch (err) {
      showToast({ title: "Erreur", description: "Impossible de bannir cet utilisateur", type: "ADMIN_ALERT" });
    } finally {
      setActionLoading(null);
      setBanDialogOpen(false);
      setSelectedUser(null);
      setBanReason("");
    }
  };

  const handleUnban = async (user: AdminUser) => {
    setActionLoading(user.id);
    try {
      const updated = await adminApi.unbanUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast({
        title: "Utilisateur réactivé",
        description: `${updated.name} a été débanni`,
        type: "SUCCESS",
      });
    } catch (err) {
      showToast({ title: "Erreur", description: "Impossible de débannir cet utilisateur", type: "ADMIN_ALERT" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async (user: AdminUser) => {
    setActionLoading(user.id);
    try {
      const updated = await adminApi.verifyUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast({
        title: "Utilisateur vérifié",
        description: `${updated.name} a maintenant le badge vérifié ✓`,
        type: "SUCCESS",
      });
    } catch (err) {
      showToast({ title: "Erreur", description: "Impossible de vérifier cet utilisateur", type: "ADMIN_ALERT" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnverify = async (user: AdminUser) => {
    setActionLoading(user.id);
    try {
      const updated = await adminApi.unverifyUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast({
        title: "Vérification retirée",
        description: `Le badge vérifié de ${updated.name} a été retiré`,
        type: "NOTIFICATION",
      });
    } catch (err) {
      showToast({ title: "Erreur", description: "Impossible de retirer la vérification", type: "ADMIN_ALERT" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    const userName = selectedUser.name;
    setActionLoading(selectedUser.id);
    try {
      await adminApi.deleteUser(selectedUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      showToast({
        title: "Utilisateur supprimé",
        description: `${userName} a été définitivement supprimé`,
        type: "ADMIN_ALERT",
      });
    } catch (err) {
      showToast({ title: "Erreur", description: "Impossible de supprimer cet utilisateur", type: "ADMIN_ALERT" });
    } finally {
      setActionLoading(null);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const bannedCount = users.filter((u) => u.banned).length;

  const exportCSV = () => {
    const headers = ["ID", "Nom", "Email", "Rôle", "Téléphone", "Ville", "Score Confiance", "Vérifié", "Banni", "Raison Ban", "Objets Perdus", "Objets Trouvés", "Matches", "Solde", "Inscrit le"];
    const rows = filteredUsers.map((u) => [
      u.id,
      u.name,
      u.email,
      u.role,
      u.phone || "",
      u.location || "",
      u.trustScore || 0,
      u.verified ? "Oui" : "Non",
      u.banned ? "Oui" : "Non",
      u.banReason || "",
      u.objectsLost || 0,
      u.objectsFound || 0,
      u.matches || 0,
      u.walletBalance || 0,
      u.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-FR") : "",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `utilisateurs_retrouvit_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Utilisateurs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Chargement..." : `${users.length} inscrits · ${adminCount} admin(s) · ${bannedCount} banni(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Mis à jour {lastRefresh.toLocaleTimeString("fr-FR")}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchUsers(true)} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={users.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            Exporter CSV ({filteredUsers.length})
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <span className="text-destructive">{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">Utilisateur</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="verified">Vérifiés</SelectItem>
            <SelectItem value="banned">Bannis</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Inscrit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {error ? "Impossible de charger les utilisateurs" : "Aucun utilisateur trouvé"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {user.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-medium">{user.name}</p>
                              {user.verified && <BadgeCheck className="h-3.5 w-3.5 text-blue-500" />}
                              {user.banned && <Ban className="h-3.5 w-3.5 text-destructive" />}
                            </div>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="text-[10px]">
                          {user.role === "ADMIN" ? "Admin" : "Utilisateur"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.banned && (
                            <Badge variant="destructive" className="text-[10px]">Banni</Badge>
                          )}
                          {user.verified && !user.banned && (
                            <Badge variant="success" className="text-[10px]">Vérifié</Badge>
                          )}
                          {!user.banned && !user.verified && (
                            <Badge variant="secondary" className="text-[10px]">Actif</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.createdAt ? formatDate(user.createdAt) : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading === user.id}>
                              {actionLoading === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/users/${user.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir le profil
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.banned ? (
                              <DropdownMenuItem onClick={() => handleUnban(user)}>
                                <ShieldOff className="h-4 w-4 mr-2 text-emerald-500" />
                                Débannir
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setBanDialogOpen(true);
                                }}
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Bannir
                              </DropdownMenuItem>
                            )}
                            {user.verified ? (
                              <DropdownMenuItem onClick={() => handleUnverify(user)}>
                                <ShieldOff className="h-4 w-4 mr-2" />
                                Retirer vérification
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleVerify(user)}>
                                <UserCheck className="h-4 w-4 mr-2 text-blue-500" />
                                Vérifier
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedUser(user);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={user.role === "ADMIN"}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Ban Dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bannir {selectedUser?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action suspendra le compte de l&apos;utilisateur. Il ne pourra plus se connecter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Raison du bannissement (optionnel)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setSelectedUser(null); setBanReason(""); }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleBan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Bannir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selectedUser?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données de l&apos;utilisateur seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Live indicator */}
      {!isLoading && !error && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Actualisation automatique toutes les 30s
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
