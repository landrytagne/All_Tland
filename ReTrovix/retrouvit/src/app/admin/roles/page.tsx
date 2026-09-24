"use client";

import * as React from "react";
import {
  Shield,
  Users,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Loader2,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AuthGuard } from "@/components/auth-guard";
import { usersApi, type UserResponse } from "@/lib/api";

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isDefault: boolean;
}

const defaultRoles: Role[] = [
  {
    id: "ADMIN",
    name: "Administrateur",
    description: "Accès complet à toutes les fonctionnalités",
    permissions: ["users.manage", "posts.manage", "reports.manage", "settings.manage"],
    userCount: 0,
    isDefault: false,
  },
  {
    id: "USER",
    name: "Utilisateur",
    description: "Utilisateur standard de la plateforme",
    permissions: ["posts.create", "posts.edit", "reports.create", "messages.send"],
    userCount: 0,
    isDefault: true,
  },
];

function RolesContent() {
  const [roles, setRoles] = React.useState<Role[]>(defaultRoles);
  const [users, setUsers] = React.useState<UserResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<Role | null>(null);
  const [formData, setFormData] = React.useState({ name: "", description: "" });
  const [processing, setProcessing] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await usersApi.getAll();
        setUsers(userData);

        // Count users per role
        setRoles((prev) =>
          prev.map((role) => ({
            ...role,
            userCount: userData.filter((u) => u.role === role.id).length,
          }))
        );
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = roles.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingRole(null);
    setFormData({ name: "", description: "" });
    setDialogOpen(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    setProcessing(true);

    setTimeout(() => {
      if (editingRole) {
        setRoles((prev) =>
          prev.map((r) =>
            r.id === editingRole.id ? { ...r, name: formData.name, description: formData.description } : r
          )
        );
      } else {
        const newRole: Role = {
          id: formData.name.toUpperCase().replace(/\s/g, "_"),
          name: formData.name,
          description: formData.description,
          permissions: [],
          userCount: 0,
          isDefault: false,
        };
        setRoles((prev) => [...prev, newRole]);
      }
      setDialogOpen(false);
      setProcessing(false);
    }, 300);
  };

  const handleDelete = (id: string) => {
    if (defaultRoles.some((r) => r.id === id)) return;
    setRoles((prev) => prev.filter((r) => r.id !== id));
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
            <Shield className="h-6 w-6" />
            Rôles
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {roles.length} rôles · {users.length} utilisateurs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
          <Button size="sm" onClick={handleAdd}>
            <Shield className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {roles.slice(0, 4).map((role) => (
          <Card key={role.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  role.id === "ADMIN" ? "bg-red-500/10" : "bg-blue-500/10"
                }`}>
                  <Shield className={`h-5 w-5 ${
                    role.id === "ADMIN" ? "text-red-500" : "text-blue-500"
                  }`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{role.userCount}</p>
                  <p className="text-xs text-muted-foreground">{role.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un rôle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rôle</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Utilisateurs</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Shield className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "Aucun rôle trouvé" : "Aucun rôle"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          role.id === "ADMIN" ? "bg-red-500/10" : "bg-blue-500/10"
                        }`}>
                          <Shield className={`h-4 w-4 ${
                            role.id === "ADMIN" ? "text-red-500" : "text-blue-500"
                          }`} />
                        </div>
                        <div>
                          <span className="font-medium">{role.name}</span>
                          {role.isDefault && (
                            <Badge variant="secondary" className="text-[10px] ml-2">
                              Défaut
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {role.description}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{role.userCount}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {role.permissions.slice(0, 2).map((p) => (
                          <Badge key={p} variant="outline" className="text-[10px]">
                            {p}
                          </Badge>
                        ))}
                        {role.permissions.length > 2 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{role.permissions.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(role)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(role.id)}
                            disabled={role.isDefault}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Modifier le rôle" : "Ajouter un rôle"}
            </DialogTitle>
            <DialogDescription>
              {editingRole
                ? "Modifiez les informations du rôle."
                : "Créez un nouveau rôle pour la plateforme."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                placeholder="Ex: Modérateur, Éditeur..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Décrivez les responsabilités de ce rôle..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={processing || !formData.name.trim()}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRole ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminRolesPage() {
  return (
    <AuthGuard requireAdmin>
      <RolesContent />
    </AuthGuard>
  );
}
