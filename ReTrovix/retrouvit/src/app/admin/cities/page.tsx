"use client";

import * as React from "react";
import {
  Map,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Loader2,
  MoreHorizontal,
  MapPin,
  Building,
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
import { AuthGuard } from "@/components/auth-guard";
import { citiesApi, type CityResponse } from "@/lib/api-admin";

interface City {
  id: string;
  name: string;
  region?: string;
  objectCount: number;
}

function CitiesContent() {
  const [cityList, setCityList] = React.useState<City[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCity, setEditingCity] = React.useState<City | null>(null);
  const [formData, setFormData] = React.useState({ name: "", region: "Cameroun" });
  const [processing, setProcessing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await citiesApi.getAll();
        setCityList(data.map((c) => ({
          id: String(c.id),
          name: c.name,
          region: c.region,
          objectCount: c.objectCount,
        })));
      } catch (err) {
        console.error("Failed to load cities:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = cityList.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalObjects = cityList.reduce((sum, c) => sum + c.objectCount, 0);

  const handleAdd = () => {
    setEditingCity(null);
    setFormData({ name: "", region: "Cameroun" });
    setDialogOpen(true);
  };

  const handleEdit = (city: City) => {
    setEditingCity(city);
    setFormData({ name: city.name, region: city.region || "Cameroun" });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    setProcessing(true);

    setTimeout(() => {
      if (editingCity) {
        setCityList((prev) =>
          prev.map((c) =>
            c.id === editingCity.id ? { ...c, name: formData.name, region: formData.region } : c
          )
        );
      } else {
        const newCity: City = {
          id: String(Date.now()),
          name: formData.name,
          region: formData.region,
          objectCount: 0,
        };
        setCityList((prev) => [...prev, newCity]);
      }
      setDialogOpen(false);
      setProcessing(false);
    }, 300);
  };

  const handleDelete = (id: string) => {
    setCityList((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Map className="h-6 w-6" />
            Villes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {cityList.length} villes · {totalObjects.toLocaleString()} objets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Map className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cityList.length}</p>
                <p className="text-xs text-muted-foreground">Villes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Building className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalObjects.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Objets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {cityList.length > 0
                    ? Math.round(totalObjects / cityList.length)
                    : 0}
                </p>
                <p className="text-xs text-muted-foreground">Moy. par ville</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {cityList.length > 0
                    ? cityList.reduce((max, c) => (c.objectCount > max.objectCount ? c : max), cityList[0]).name
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">Ville #1</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher une ville..."
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
                <TableHead>Ville</TableHead>
                <TableHead>Région</TableHead>
                <TableHead>Objets</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <Map className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "Aucune ville trouvée" : "Aucune ville"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((city) => (
                  <TableRow key={city.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{city.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {city.region}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {city.objectCount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(city)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(city.id)}
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
              {editingCity ? "Modifier la ville" : "Ajouter une ville"}
            </DialogTitle>
            <DialogDescription>
              {editingCity
                ? "Modifiez les informations de la ville."
                : "Ajoutez une nouvelle ville à la plateforme."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                placeholder="Ex: Yaoundé, Douala..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Région</Label>
              <Input
                id="region"
                placeholder="Ex: Cameroun"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={processing || !formData.name.trim()}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCity ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminCitiesPage() {
  return (
    <AuthGuard requireAdmin>
      <CitiesContent />
    </AuthGuard>
  );
}
