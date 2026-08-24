"use client";

import * as React from "react";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  Eye,
  BadgeCheck,
  Flag,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  FileText,
  Smartphone,
  Briefcase,
  Key,
  PawPrint,
  Car,
  Shirt,
  Gem,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// Lazy-load heavy dialog components to reduce initial bundle
const ReportDialog = React.lazy(() =>
  import("@/components/report-dialog").then((m) => ({ default: m.ReportDialog }))
);
const ShareDialog = React.lazy(() =>
  import("@/components/share-dialog").then((m) => ({ default: m.ShareDialog }))
);
import { interactionsApi, savedApi, type InteractionResponse } from "@/lib/api-objects";
import { formatRelativeTime, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, React.ElementType> = {
  Documents: FileText,
  "Électronique": Smartphone,
  "Sacs & Bagages": Briefcase,
  Clés: Key,
  Animaux: PawPrint,
  Véhicules: Car,
  Vêtements: Shirt,
  Bijoux: Gem,
  Autres: Package,
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  active: { label: "Actif", variant: "success" },
  matched: { label: "Correspondance", variant: "warning" },
  resolved: { label: "Résolu", variant: "default" },
  returned: { label: "Retourné", variant: "default" },
  expired: { label: "Expiré", variant: "secondary" },
  OPEN: { label: "Ouvert", variant: "success" },
  PENDING: { label: "En attente", variant: "warning" },
  CLOSED: { label: "Fermé", variant: "secondary" },
};

interface ObjectCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  image?: string;
  user: {
    name: string;
    avatar?: string;
    trustScore: number;
    verified: boolean;
  };
  status: string;
  reward?: number;
  views: number;
  type: "lost" | "found";
}

export function ObjectCard({
  id,
  title,
  description,
  category,
  location,
  date,
  image,
  user,
  status,
  reward,
  views,
  type,
}: ObjectCardProps) {
  const CategoryIcon = categoryIcons[category] || Package;
  const statusInfo = statusConfig[status] || { label: status || "Inconnu", variant: "outline" as const };
  const imageUrl = image || null;
  const objectId = Number(id);

  const [interactions, setInteractions] = React.useState<InteractionResponse | null>(null);
  const [isLiking, setIsLiking] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);

  React.useEffect(() => {
    interactionsApi.get(type, objectId).then(setInteractions).catch(() => {});
    savedApi.getStatus(type, objectId).then((r) => setIsSaved(r.saved)).catch(() => {});
  }, [type, objectId]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLiking) return;
    setIsLiking(true);
    try {
      const result = await interactionsApi.toggleLike(type, objectId);
      setInteractions(result);
    } catch {
      // ignore
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const result = await savedApi.toggle(type, objectId);
      setIsSaved(result.saved);
    } catch {
      // ignore
    }
  };

  return (
    <Link href={`/object/${type}/${id}`}>
      <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/20">
        <CardContent className="p-4">
          {/* Image */}
          {imageUrl ? (
            <div className="aspect-[16/10] rounded-lg overflow-hidden bg-muted mb-3">
              <img
                src={imageUrl}
                alt={title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
          ) : null}

          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                <CategoryIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{category}</p>
                <p className="text-[11px] text-muted-foreground/70">
                  {formatRelativeTime(date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <React.Suspense fallback={null}>
                <ShareDialog
                  title={title}
                  description={description}
                  trigger={
                    <button
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 hover:text-forest hover:bg-forest/10 transition-all"
                      title="Partager"
                      onClick={(e) => e.preventDefault()}
                    >
                      <Share2 className="h-3 w-3" />
                    </button>
                  }
                />
              </React.Suspense>
              <React.Suspense fallback={null}>
                <ReportDialog
                  objectId={objectId}
                  objectType={type}
                  objectTitle={title}
                  reportedUserId={undefined}
                  trigger={
                    <button
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 hover:text-orange-brand hover:bg-orange-brand/10 transition-all"
                      title="Signaler"
                    >
                      <Flag className="h-3 w-3" />
                    </button>
                  }
                />
              </React.Suspense>
            </div>
          </div>

          {/* Title & Description */}
          <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {description}
          </p>

          {/* Location & Views */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{views}</span>
            </div>
          </div>

          {/* Reward */}
          {reward && type === "lost" && (
            <div className="rounded-md bg-amber-50 px-3 py-1.5 mb-3 dark:bg-amber-950/30">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Récompense : {formatCurrency(reward)}
              </p>
            </div>
          )}

          {/* Likes & Comments bar */}
          {(interactions && (interactions.likeCount > 0 || interactions.commentCount > 0)) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 px-1">
              {interactions.likeCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-brand/10">
                    <Heart className="h-2.5 w-2.5 text-orange-brand" />
                  </span>
                  <span>{interactions.likeCount}</span>
                </div>
              )}
              {interactions.commentCount > 0 && (
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  <span>{interactions.commentCount}</span>
                </div>
              )}
            </div>
          )}

          {/* User */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium">{user.name}</span>
                {user.verified && (
                  <BadgeCheck className="h-3 w-3 text-blue-500" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Like button */}
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-all",
                  interactions?.liked
                    ? "bg-orange-brand/10 text-orange-brand font-medium"
                    : "text-muted-foreground hover:text-orange-brand hover:bg-orange-brand/5"
                )}
                title={interactions?.liked ? "Retirer le like" : "Aimer"}
              >
                <Heart
                  className={cn(
                    "h-3.5 w-3.5 transition-all",
                    interactions?.liked && "fill-orange-brand"
                  )}
                />
                {interactions && interactions.likeCount > 0 && (
                  <span>{interactions.likeCount}</span>
                )}
              </button>
              {/* Save button */}
              <button
                onClick={handleSave}
                className={cn(
                  "flex items-center rounded-full px-1.5 py-1 text-xs transition-all",
                  isSaved
                    ? "bg-forest/10 text-forest font-medium"
                    : "text-muted-foreground hover:text-forest hover:bg-forest/5"
                )}
                title={isSaved ? "Retirer des sauvegardes" : "Sauvegarder"}
              >
                <Bookmark
                  className={cn(
                    "h-3.5 w-3.5 transition-all",
                    isSaved && "fill-forest"
                  )}
                />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
