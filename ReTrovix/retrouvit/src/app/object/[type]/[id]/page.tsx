"use client";

import * as React from "react";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  Eye,
  BadgeCheck,
  MessageCircle,
  Share2,
  ArrowLeft,
  Shield,
  Heart,
  FileText,
  Smartphone,
  Briefcase,
  Key,
  PawPrint,
  Car,
  Shirt,
  Gem,
  Package,
  Clock,
  EyeOff,
  Wallet,
  Loader2,
  CheckCircle2,
  Navigation,
  Bookmark,
  Send,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ImageGallery } from "@/components/image-gallery";
import { ReportDialog } from "@/components/report-dialog";
import { ShareDialog } from "@/components/share-dialog";
import dynamic from "next/dynamic";

const ObjectCard = dynamic(
  () => import("@/components/object-card").then((m) => ({ default: m.ObjectCard })),
  {
    loading: () => (
      <div className="h-[280px] rounded-lg bg-muted/30 animate-pulse" />
    ),
    ssr: false,
  }
);
import { ObjectCardGridSkeleton, Skeleton } from "@/components/skeletons";
import {
  lostObjectsApi,
  foundObjectsApi,
  type LostObjectResponse,
  type FoundObjectResponse,
} from "@/lib/api-objects";
import { conversationsApi } from "@/lib/api-chat";
import { interactionsApi, savedApi, type InteractionResponse, type CommentResponse } from "@/lib/api-objects";
import { formatCurrency, formatDate, formatRelativeTime, getAvatarUrl } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { showToast } from "@/lib/toast";

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

const statusConfig = {
  active: { label: "Actif", color: "bg-forest/10 text-forest dark:bg-forest/20 dark:text-forest-light", dot: "bg-forest" },
  matched: { label: "Correspondance", color: "bg-orange-brand/10 text-orange-brand dark:bg-orange-brand/20 dark:text-orange-light", dot: "bg-orange-brand" },
  resolved: { label: "Résolu", color: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  returned: { label: "Retourné", color: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400", dot: "bg-blue-500" },
  expired: { label: "Expiré", color: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

export default function ObjectDetailPage() {
  return (
    <MainLayout showFooter={false}>
      <ObjectDetailContent />
    </MainLayout>
  );
}

function ObjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const type = params.type as string;
  const id = params.id as string;

  const [obj, setObj] = React.useState<LostObjectResponse | FoundObjectResponse | null>(null);
  const [similarObjects, setSimilarObjects] = React.useState<(LostObjectResponse | FoundObjectResponse)[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isNotFound, setIsNotFound] = React.useState(false);
  const [contactLoading, setContactLoading] = React.useState(false);
  const [showContactSuccess, setShowContactSuccess] = React.useState(false);
  const [contactDialogOpen, setContactDialogOpen] = React.useState(false);
  const [contactMessage, setContactMessage] = React.useState("");
  const [interactions, setInteractions] = React.useState<InteractionResponse | null>(null);
  const [isLiking, setIsLiking] = React.useState(false);
  const [comments, setComments] = React.useState<CommentResponse[]>([]);
  const [isSaved, setIsSaved] = React.useState(false);
  const [commentText, setCommentText] = React.useState("");
  const [commentLoading, setCommentLoading] = React.useState(false);
  const [replyTo, setReplyTo] = React.useState<number | null>(null);
  const commentInputRef = React.useRef<HTMLTextAreaElement>(null);

  const isLost = type === "lost";

  React.useEffect(() => {
    const fetchObject = async () => {
      try {
        if (isLost) {
          const data = await lostObjectsApi.getById(Number(id));
          setObj(data);
          const allLost = await lostObjectsApi.getByCategory(data.category, 0, 10);
          const similar = (allLost.content || []).filter((o) => o.id !== Number(id)).slice(0, 3);
          setSimilarObjects(similar);
        } else {
          const data = await foundObjectsApi.getById(Number(id));
          setObj(data);
          const allFound = await foundObjectsApi.getByCategory(data.category, 0, 10);
          const similar = (allFound.content || []).filter((o) => o.id !== Number(id)).slice(0, 3);
          setSimilarObjects(similar);
        }
      } catch (err) {
        console.warn("Could not fetch object:", err);
        setIsNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchObject();
  }, [id, isLost]);

  // Fetch interactions + saved status
  React.useEffect(() => {
    interactionsApi.get(type, Number(id)).then(setInteractions).catch(() => {});
    interactionsApi.getComments(type, Number(id)).then(setComments).catch(() => {});
    savedApi.getStatus(type, Number(id)).then((r) => setIsSaved(r.saved)).catch(() => {});
  }, [id, type]);

  const handleLike = async () => {
    if (!currentUser) { router.push("/auth/login"); return; }
    if (isLiking) return;
    setIsLiking(true);
    try {
      const result = await interactionsApi.toggleLike(type, Number(id));
      setInteractions(result);
    } catch { /* ignore */ } finally {
      setIsLiking(false);
    }
  };

  const handleAddComment = async () => {
    if (!currentUser || !commentText.trim()) return;
    setCommentLoading(true);
    try {
      const newComment = await interactionsApi.addComment(type, Number(id), {
        content: commentText.trim(),
        ...(replyTo ? { parentId: replyTo } : {}),
      });
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
      setReplyTo(null);
      setInteractions((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);
    } catch { /* ignore */ } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await interactionsApi.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setInteractions((prev) => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : null);
    } catch { /* ignore */ }
  };

  const handleSave = async () => {
    if (!currentUser) { router.push("/auth/login"); return; }
    try {
      const result = await savedApi.toggle(type, Number(id));
      setIsSaved(result.saved);
      showToast({
        title: result.saved ? "Sauvegardé" : "Retiré des sauvegardes",
        description: result.saved ? "Annonce ajoutée à vos favoris" : "Annonce retirée de vos favoris",
        type: "SUCCESS",
      });
    } catch {
      // ignore
    }
  };

  const handleContact = () => {
    if (!obj || !currentUser) {
      router.push("/auth/login");
      return;
    }
    // Set default message based on object type
    const isLost = type === "lost";
    const defaultMessage = isLost
      ? `Bonjour ${obj.user.name}, j'ai vu votre publication sur "${obj.title}" et je pense pouvoir vous aider. Contactons-nous !`
      : `Bonjour ${obj.user.name}, je pense que "${obj.title}" pourrait bien être ce que je recherche. Discutons-en !`;
    setContactMessage(defaultMessage);
    setContactDialogOpen(true);
  };

  const handleSendFirstMessage = async () => {
    if (!obj || !currentUser) return;
    setContactLoading(true);
    try {
      await conversationsApi.getOrCreateWithMessage(
        obj.user.id,
        contactMessage.trim() || `Bonjour, je souhaite discuter à propos de "${obj.title}".`,
        obj.title,
        type,
        String(obj.id)
      );
      setContactDialogOpen(false);
      setShowContactSuccess(true);
      showToast({
        title: "Demande envoyée",
        description: `${obj.user.name} recevra une notification et pourra accepter de discuter.`,
        type: "SUCCESS",
      });
      setTimeout(() => router.push("/messages"), 1500);
    } catch (err) {
      console.error("Error creating conversation:", err);
      showToast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande.",
        type: "ADMIN_ALERT",
      });
    } finally {
      setContactLoading(false);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6 animate-fade-in">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="aspect-[16/10] rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isNotFound || !obj) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center animate-fade-in">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-muted mb-4">
          <Package className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Objet non trouvé</h1>
        <p className="text-muted-foreground mb-6">Cette annonce n&apos;existe pas ou a été supprimée.</p>
        <Link href="/feed">
          <Button className="rounded-xl bg-forest hover:bg-forest/90">
            Retour au fil d&apos;actualité
          </Button>
        </Link>
      </div>
    );
  }

  const date = isLost ? (obj as LostObjectResponse).dateLost : (obj as FoundObjectResponse).dateFound;
  const reward = isLost ? (obj as LostObjectResponse).reward : undefined;
  const CategoryIcon = categoryIcons[obj.category] || Package;
  const status = statusConfig[obj.status as keyof typeof statusConfig] || statusConfig.active;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* ── Back button ── */}
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 group transition-colors"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Retour au fil
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ═══ Main Content ═══ */}
        <div className="lg:col-span-2 space-y-5">
          {/* ── Gallery ── */}
          <ImageGallery
            image={obj.image}
            images={obj.images}
            title={obj.title}
            category={obj.category}
            type={type as "lost" | "found"}
          />

          {/* ── Title & Meta ── */}
          <Card className="overflow-hidden border-0 shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("rounded-full text-xs font-bold", status.color)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", status.dot)} />
                      {status.label}
                    </Badge>
                    <Badge variant="outline" className="rounded-full text-xs">
                      <CategoryIcon className="h-3 w-3 mr-1" />
                      {obj.category}
                    </Badge>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{obj.title}</h1>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-xl",
                      isSaved
                        ? "bg-forest/10 text-forest border-forest/20 hover:bg-forest/15"
                        : "hover:bg-forest/10 hover:text-forest hover:border-forest/20"
                    )}
                    onClick={handleSave}
                    title={isSaved ? "Retirer des sauvegardes" : "Sauvegarder"}
                  >
                    <Bookmark className={cn("h-4 w-4", isSaved && "fill-forest")} />
                  </Button>
                  <ShareDialog
                    title={obj.title}
                    description={obj.description}
                    trigger={
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-forest/10 hover:text-forest hover:border-forest/20"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <ReportDialog
                    objectId={Number(id)}
                    objectType={type as "lost" | "found"}
                    objectTitle={obj.title}
                    reportedUserId={obj.user?.id}
                    trigger={
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-orange-brand/10 hover:text-orange-brand hover:border-orange-brand/20"
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              </div>

              {/* Meta pills */}
              <div className="flex flex-wrap gap-2 mb-5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                  <MapPin className="h-3 w-3 text-forest" />
                  {obj.location}, {obj.city}
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                  <Calendar className="h-3 w-3 text-orange-brand" />
                  {isLost ? "Perdu le" : "Trouvé le"} {formatDate(date)}
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                  <Eye className="h-3 w-3" />
                  {obj.views} vues
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(obj.createdAt)}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold text-sm mb-2 text-foreground/80">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {obj.description}
                </p>
              </div>

              {/* Like bar */}
              <Separator className="my-5" />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLike}
                  disabled={!currentUser}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                    interactions?.liked
                      ? "bg-orange-brand/10 text-orange-brand border border-orange-brand/20"
                      : "bg-muted/50 text-muted-foreground hover:bg-orange-brand/5 hover:text-orange-brand border border-transparent"
                  )}
                >
                  <Heart className={cn("h-4 w-4", interactions?.liked && "fill-orange-brand")} />
                  {interactions?.liked ? "Aimé" : "Aimer"}
                  {interactions && interactions.likeCount > 0 && (
                    <span className="text-xs">({interactions.likeCount})</span>
                  )}
                </button>
                <button
                  onClick={() => commentInputRef.current?.focus()}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-muted/50 text-muted-foreground hover:bg-forest/5 hover:text-forest border border-transparent transition-all"
                >
                  <MessageCircle className="h-4 w-4" />
                  Commenter
                  {interactions && interactions.commentCount > 0 && (
                    <span className="text-xs">({interactions.commentCount})</span>
                  )}
                </button>
              </div>

              {/* Reward */}
              {reward && (
                <>
                  <Separator className="my-5" />
                  <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-4 border border-amber-200/50 dark:border-amber-800/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50">
                        <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="font-bold text-amber-700 dark:text-amber-300">
                          Récompense : {formatCurrency(reward)}
                        </p>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                          Versée via notre système de paiement sécurisé après restitution
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Location Map ── */}
          <Card className="overflow-hidden border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10">
                  <Navigation className="h-4 w-4 text-forest" />
                </div>
                <h3 className="font-semibold">Localisation</h3>
              </div>
              <div className="relative aspect-[16/8] rounded-xl bg-gradient-to-br from-forest/5 to-forest/10 dark:from-forest/10 dark:to-forest/5 flex items-center justify-center overflow-hidden">
                {/* Decorative grid pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                <div className="text-center relative">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-forest/10 mb-3">
                    <MapPin className="h-7 w-7 text-forest" />
                  </div>
                  <p className="font-medium text-foreground">{obj.location}</p>
                  <p className="text-sm text-muted-foreground">{obj.city}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Comments Section ── */}
          <Card className="overflow-hidden border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10">
                  <MessageCircle className="h-4 w-4 text-forest" />
                </div>
                <h3 className="font-semibold">Commentaires</h3>
                {interactions && interactions.commentCount > 0 && (
                  <Badge variant="secondary" className="rounded-full text-xs">
                    {interactions.commentCount}
                  </Badge>
                )}
              </div>

              {/* Comment input */}
              <div className="mb-5">
                {replyTo && (
                  <div className="flex items-center justify-between mb-2 px-3 py-1.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                    <span>Réponse en cours...</span>
                    <button onClick={() => setReplyTo(null)} className="text-orange-brand hover:underline">Annuler</button>
                  </div>
                )}
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-forest text-white text-xs">
                      {currentUser?.name?.split(" ").map((n) => n[0]).join("") || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <textarea
                      ref={commentInputRef}
                      placeholder="Écrire un commentaire..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="w-full rounded-xl border bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/30 placeholder:text-muted-foreground/50"
                      rows={2}
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        disabled={!commentText.trim() || commentLoading}
                        className="rounded-xl bg-forest hover:bg-forest/90 text-white"
                      >
                        {commentLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <MessageCircle className="h-3.5 w-3.5 mr-1" />}
                        Publier
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments list */}
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground/60">Aucun commentaire pour le moment</p>
                  <p className="text-xs text-muted-foreground/40 mt-1">Soyez le premier à réagir !</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUser?.id}
                      onDelete={handleDeleteComment}
                      onReply={(commentId) => { setReplyTo(commentId); commentInputRef.current?.focus(); }}
                      type={type}
                      objectId={Number(id)}
                      onCommentAdded={(newComment) => {
                        setComments((prev) => [...prev, newComment]);
                        setInteractions((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ═══ Sidebar ═══ */}
        <div className="space-y-5">
          {/* ── Author Card ── */}
          <Card className="overflow-hidden border-0 shadow-sm">
            <div className="h-20 bg-gradient-to-r from-forest via-forest/80 to-forest-light/60 relative">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)" }} />
            </div>
            <CardContent className="px-6 pb-6 -mt-8 relative">
              <Avatar className="h-16 w-16 border-4 border-card shadow-lg mb-3">
                <AvatarImage src={getAvatarUrl(obj.user?.avatar)} />
                <AvatarFallback className="bg-forest text-white font-bold text-lg">
                  {obj.user.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5 mb-1">
                <p className="font-bold text-lg">{obj.user.name}</p>
                {obj.user.verified && (
                  <BadgeCheck className="h-5 w-5 text-blue-500" />
                )}
              </div>
              {obj.user.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="h-3 w-3" />
                  {obj.user.location}
                </p>
              )}

              {/* Trust score */}
              <div className="mt-3 p-3 rounded-xl bg-muted/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Score de confiance</span>
                  <span className="text-sm font-bold text-forest">{obj.user.trustScore || 50}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-forest to-forest-light transition-all duration-500"
                    style={{ width: `${obj.user.trustScore || 50}%` }}
                  />
                </div>
              </div>

              {/* Contact button */}
              <Button
                className={cn(
                  "w-full mt-4 gap-2 rounded-xl font-medium",
                  showContactSuccess
                    ? "bg-forest hover:bg-forest"
                    : "bg-forest hover:bg-forest/90 dark:bg-forest-light dark:hover:bg-forest-light/90"
                )}
                onClick={handleContact}
                disabled={contactLoading}
              >
                {contactLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : showContactSuccess ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                {showContactSuccess ? "Redirection..." : "Contacter"}
              </Button>

              {/* Contact Dialog */}
              <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-forest" />
                      Contacter {obj?.user?.name}
                    </DialogTitle>
                    <DialogDescription>
                      Envoyez un premier message pour initier la discussion. La personne recevra une notification avec votre message.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getAvatarUrl(obj?.user?.avatar)} />
                        <AvatarFallback className="text-xs">
                          {obj?.user?.name?.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{obj?.user?.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{obj?.title}</p>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Votre message..."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      rows={4}
                      className="rounded-xl"
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 rounded-xl"
                        onClick={handleSendFirstMessage}
                        disabled={contactLoading}
                      >
                        {contactLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Send className="h-4 w-4 mr-1" />
                        )}
                        Envoyer
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => setContactDialogOpen(false)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* ── Security Info ── */}
          <Card className="overflow-hidden border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10">
                  <Shield className="h-4 w-4 text-forest" />
                </div>
                <h3 className="font-semibold text-sm">Sécurité garantie</h3>
              </div>
              <div className="space-y-3">
                {[
                  { icon: Shield, text: "Transactions sécurisées", color: "text-forest" },
                  { icon: Shield, text: "Système de séquestre", color: "text-forest" },
                  { icon: Shield, text: "Messagerie chiffrée", color: "text-forest" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-forest/5">
                      <item.icon className={cn("h-3 w-3", item.color)} />
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Similar Objects ── */}
          {similarObjects.length > 0 && (
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-brand/10">
                    <Heart className="h-4 w-4 text-orange-brand" />
                  </div>
                  <h3 className="font-semibold text-sm">Annonces similaires</h3>
                </div>
                <div className="space-y-2">
                  {similarObjects.map((o) => (
                    <Link
                      key={o.id}
                      href={`/object/${type}/${o.id}`}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-all group"
                    >
                      <div className={cn(
                        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                        type === "lost" ? "bg-orange-brand/10" : "bg-forest/10"
                      )}>
                        <CategoryIcon className={cn(
                          "h-4 w-4",
                          type === "lost" ? "text-orange-brand" : "text-forest"
                        )} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium line-clamp-1 group-hover:text-forest transition-colors">{o.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{o.location}, {o.city}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comment Item ────────────────────────────────────────────────

interface CommentItemProps {
  comment: CommentResponse;
  currentUserId?: number;
  onDelete: (id: number) => void;
  onReply: (parentId: number) => void;
  type: string;
  objectId: number;
  onCommentAdded: (comment: CommentResponse) => void;
  depth?: number;
}

function CommentItem({ comment, currentUserId, onDelete, onReply, type, objectId, onCommentAdded, depth = 0 }: CommentItemProps) {
  const [showReplies, setShowReplies] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [replyLoading, setReplyLoading] = React.useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      const newComment = await interactionsApi.addComment(type, objectId, {
        content: replyText.trim(),
        parentId: comment.id,
      });
      onCommentAdded(newComment);
      setReplyText("");
      setShowReplies(true);
    } catch { /* ignore */ } finally {
      setReplyLoading(false);
    }
  };

  const isOwner = currentUserId && currentUserId === comment.user?.id;

  return (
    <div className={cn("group/comment", depth > 0 && "ml-8 mt-3")}>
      <div className="flex gap-3">
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarFallback className="bg-forest/10 text-forest text-[10px] font-bold">
            {comment.user?.name?.split(" ").map((n) => n[0]).join("") || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{comment.user?.name}</span>
            {comment.user?.verified && <BadgeCheck className="h-3 w-3 text-blue-500" />}
            <span className="text-[11px] text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
          </div>
          {comment.deleted ? (
            <p className="text-sm text-muted-foreground/50 italic">{comment.content}</p>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">{comment.content}</p>
          )}
          {!comment.deleted && (
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => onReply(comment.id)}
                className="text-xs text-muted-foreground hover:text-forest transition-colors font-medium"
              >
                Répondre
              </button>
              {isOwner && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors font-medium opacity-0 group-hover/comment:opacity-100"
                >
                  Supprimer
                </button>
              )}
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3">
              {!showReplies ? (
                <button
                  onClick={() => setShowReplies(true)}
                  className="text-xs font-medium text-forest hover:underline"
                >
                  Afficher {comment.replies.length} réponse{comment.replies.length > 1 ? "s" : ""}
                </button>
              ) : (
                <div className="space-y-3 pl-2 border-l-2 border-forest/10">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      currentUserId={currentUserId}
                      onDelete={onDelete}
                      onReply={onReply}
                      type={type}
                      objectId={objectId}
                      onCommentAdded={onCommentAdded}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
