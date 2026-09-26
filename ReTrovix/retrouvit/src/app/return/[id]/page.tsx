"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { returnsApi, type ReturnRequestResponse, type TimelineEvent } from "@/lib/api";
import { proofsApi, type ProofResponse } from "@/lib/api-proof";
import { LocationSharingCard } from "@/components/return/location-sharing-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageCircle, CheckCircle2, Calendar, MapPin,
  Navigation, Star, AlertTriangle, Loader2, Clock,
  Shield, CreditCard, XCircle, Send, FileSearch,
  Lock, Eye, Upload, Wallet, Ban, MessageSquare, Zap,
} from "lucide-react";

/**
 * Collaboration unique (§27) — une seule action contextuelle par état.
 * Machine d'états officielle (§25) :
 * MATCH_FOUND → VERIFICATION_PENDING → VERIFIED → CONNECTION_PENDING →
 * CHAT_ACTIVE → PROPOSAL_PENDING → PAYMENT_PENDING → ESCROW_FUNDED →
 * MISSION_READY → MISSION_STARTED → MEETING_IN_PROGRESS → HANDOVER_PENDING → COMPLETED
 */

const STEPS: { key: string; label: string; icon: React.ElementType }[] = [
  { key: "MATCH_FOUND", label: "Correspondance", icon: FileSearch },
  { key: "VERIFIED", label: "Vérifiée", icon: Shield },
  { key: "CHAT_ACTIVE", label: "Discussion", icon: MessageCircle },
  { key: "PAYMENT", label: "Paiement", icon: Wallet },
  { key: "MISSION", label: "Mission", icon: Navigation },
  { key: "HANDOVER", label: "Confirmation", icon: CheckCircle2 },
  { key: "COMPLETED", label: "Terminé", icon: Star },
];

/** Position de l'étape sur la barre de progression (index dans STEPS). */
const STATUS_TO_STEP_INDEX: Record<string, number> = {
  MATCH_FOUND: 0,
  VERIFICATION_PENDING: 0,
  VERIFIED: 1,
  CONNECTION_PENDING: 1,
  CHAT_ACTIVE: 2,
  PROPOSAL_PENDING: 2,
  PAYMENT_PENDING: 3,
  ESCROW_FUNDED: 3,
  MISSION_READY: 4,
  MISSION_STARTED: 4,
  MEETING_IN_PROGRESS: 5,
  HANDOVER_PENDING: 5,
  COMPLETED: 6,
  REJECTED: -1,
  PAYMENT_FAILED: -1,
  DISPUTED: -1,
  UNDER_REVIEW: -1,
  RESOLVED: -1,
  REFUNDED: -1,
  CANCELLED: -1,
};

export default function ReturnFlowPage() {
  const params = useParams();
  const router = useRouter();
  const returnId = Number(params.id);
  const { user } = useAuth();
  const { t, locale } = useTranslation();

  const [returnData, setReturnData] = React.useState<ReturnRequestResponse | null>(null);
  const [timeline, setTimeline] = React.useState<TimelineEvent[]>([]);
  const [proofs, setProofs] = React.useState<ProofResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // §2 : question de vérification
  const [verifyAnswer, setVerifyAnswer] = React.useState("");
  // §6 : proposition du Finder
  const [proposeAmount, setProposeAmount] = React.useState("");
  const [proposeDate, setProposeDate] = React.useState("");
  const [proposeLocation, setProposeLocation] = React.useState("");
  // §8 : contre-proposition
  const [counterAmount, setCounterAmount] = React.useState("");
  // §22 : litige
  const [disputeReason, setDisputeReason] = React.useState("");
  // §21 : évaluation
  const [ratingStars, setRatingStars] = React.useState(5);
  const [ratingComment, setRatingComment] = React.useState("");

  const isLoser = returnData ? returnData.loser.id === user?.id : false;
  const isFinder = returnData ? returnData.finder.id === user?.id : false;

  const fetchReturn = React.useCallback(async () => {
    try {
      const data = await returnsApi.getById(returnId);
      setReturnData(data);
      const [timelineData, proofsData] = await Promise.all([
        returnsApi.getTimeline(returnId).catch(() => []),
        proofsApi.getByReturnId(returnId).catch(() => []),
      ]);
      setTimeline(timelineData);
      setProofs(proofsData);
    } catch (err) {
      console.error("Failed to fetch return:", err);
    } finally {
      setLoading(false);
    }
  }, [returnId]);

  React.useEffect(() => { fetchReturn(); }, [fetchReturn]);

  const handleAction = async (action: () => Promise<unknown>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await action();
      await fetchReturn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat("fr-CM").format(n) + " XAF";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Collaboration non trouvée</p>
      </div>
    );
  }

  const other = isLoser ? returnData.finder : returnData.loser;
  const status = returnData.status;
  const stepIndex = STATUS_TO_STEP_INDEX[status] ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-6 px-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-3">
          ← {t("common.back")}
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Restitution {returnData.reference}</h1>
          {status === "HANDOVER_PENDING" && (
            <Badge className="bg-emerald-600"><Zap className="h-3 w-3 mr-1" />Forte</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoser ? "Retrouvé par " : "Chercheur : "}{other.name}
        </p>
      </div>

      {/* Progress Steps (§27 — progression visible mais état technique caché) */}
      {stepIndex >= 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {STEPS.map((step, i) => {
                const StepIcon = step.icon;
                const isActive = i === stepIndex;
                const isDone = i < stepIndex;
                return (
                  <div key={step.key} className="flex flex-col items-center gap-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone ? "bg-primary text-primary-foreground"
                        : isActive ? "bg-primary/20 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : <StepIcon className="h-3.5 w-3.5" />}
                    </div>
                    <span className={`text-[10px] ${isActive ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {actionError && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          §1-2 : MATCH_FOUND / VERIFICATION_PENDING — vérification de propriété
          ═══════════════════════════════════════════════════════════ */}
      {(status === "MATCH_FOUND" || status === "VERIFICATION_PENDING") && (
        isLoser ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Vérification de propriété
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pour protéger le propriétaire et la personne qui a retrouvé l&apos;objet,
                répondez à cette question :
              </p>
              {returnData.foundObjectTitle && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">{returnData.foundObjectTitle}</p>
                </div>
              )}
              <Input
                value={verifyAnswer}
                onChange={(e) => setVerifyAnswer(e.target.value)}
                placeholder="Votre réponse..."
                disabled={actionLoading}
              />
              {(returnData.verificationAttempts ?? 0) > 0 && (
                <p className="text-xs text-amber-600">
                  ⚠️ {returnData.verificationAttempts} échec(s) — 5 tentatives maximum.
                </p>
              )}
              <Button
                onClick={() => handleAction(async () => {
                  await returnsApi.verifyOwnership(returnId, verifyAnswer);
                  setVerifyAnswer("");
                })}
                disabled={!verifyAnswer || actionLoading}
                className="w-full"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4 mr-1" />}
                Vérifier ma réponse
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-medium">En attente de la vérification du Chercheur...</p>
              <p className="text-xs text-muted-foreground mt-1">
                {other.name} doit prouver que l&apos;objet lui appartient.
              </p>
            </CardContent>
          </Card>
        )
      )}

      {/* ═══════════════════════════════════════════════════════════
          §3 : VERIFIED — Demander la restitution (Chercheur)
          ═══════════════════════════════════════════════════════════ */}
      {status === "VERIFIED" && (
        isLoser ? (
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Propriété vérifiée
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Votre réponse correspond aux informations connues. Vous pouvez maintenant demander sa restitution.
              </p>
              <Button
                onClick={() => handleAction(() => returnsApi.requestConnection(returnId))}
                disabled={actionLoading}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-1" />
                Demander la restitution
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-medium">Propriété vérifiée ✅</p>
              <p className="text-xs text-muted-foreground mt-1">
                En attente de la demande de restitution du Chercheur.
              </p>
            </CardContent>
          </Card>
        )
      )}

      {/* ═══════════════════════════════════════════════════════════
          §4 : CONNECTION_PENDING — Le Finder accepte / refuse
          ═══════════════════════════════════════════════════════════ */}
      {status === "CONNECTION_PENDING" && (
        isFinder ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Demande de restitution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Un utilisateur a correctement répondu à la question de vérification associée à votre objet.
                Il souhaite maintenant organiser sa restitution.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAction(() => returnsApi.acceptConnection(returnId))}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Accepter
                </Button>
                <Button
                  onClick={() => handleAction(() => returnsApi.rejectConnection(returnId))}
                  disabled={actionLoading}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-1" /> Refuser
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-medium">Demande envoyée</p>
              <p className="text-xs text-muted-foreground mt-1">
                {other.name} doit accepter ou refuser la mise en relation.
              </p>
            </CardContent>
          </Card>
        )
      )}

      {/* ═══════════════════════════════════════════════════════════
          §5-6 : CHAT_ACTIVE — discussion + le Finder organise
          ═══════════════════════════════════════════════════════════ */}
      {status === "CHAT_ACTIVE" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Conversation ouverte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Discutez librement des modalités. Les échanges sont conservés en cas de litige.
            </p>
            {isFinder && (
              <div className="border-t pt-3 space-y-3">
                <p className="text-sm font-medium">Organiser la restitution</p>
                <Input
                  type="number"
                  value={proposeAmount}
                  onChange={(e) => setProposeAmount(e.target.value)}
                  placeholder="Récompense proposée (XAF)"
                  min="100"
                />
                <DateTimePicker
                  value={proposeDate}
                  onChange={setProposeDate}
                  placeholder="Date et heure prévues"
                />
                <Input
                  value={proposeLocation}
                  onChange={(e) => setProposeLocation(e.target.value)}
                  placeholder="Lieu de rendez-vous (privilégiez les lieux publics)"
                />
                <Button
                  onClick={() => handleAction(async () => {
                    await returnsApi.propose(returnId, {
                      amount: Number(proposeAmount),
                      meetingDate: proposeDate,
                      location: proposeLocation,
                    });
                    setProposeAmount("");
                    setProposeLocation("");
                  })}
                  disabled={!proposeAmount || !proposeDate || !proposeLocation || actionLoading}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Envoyer la proposition
                </Button>
              </div>
            )}
            <Button onClick={() => router.push("/messages")} variant="outline" className="w-full">
              <MessageCircle className="h-4 w-4 mr-1" />
              Ouvrir la messagerie
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          §7-8 : PROPOSAL_PENDING — le Chercheur examine
          ═══════════════════════════════════════════════════════════ */}
      {status === "PROPOSAL_PENDING" && (
        isLoser ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Nouvelle proposition de restitution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-2xl font-bold text-primary">{formatCurrency(returnData.proposedAmount || 0)}</p>
                {returnData.meetingDate && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                    <Calendar className="h-3 w-3" /> {new Date(returnData.meetingDate).toLocaleString("fr")}
                  </p>
                )}
                {returnData.meetingLocation && (
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <MapPin className="h-3 w-3" /> {returnData.meetingLocation}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                🔒 Les fonds seront conservés en séquestre par RetrouvIt jusqu&apos;à la confirmation de la restitution.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAction(() => returnsApi.acceptProposal(returnId))}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Accepter et payer
                </Button>
                <Button
                  onClick={() => handleAction(() => returnsApi.rejectProposal(returnId))}
                  disabled={actionLoading}
                  variant="outline"
                >
                  Refuser
                </Button>
              </div>
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs text-muted-foreground">Le montant ne convient pas ?</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    placeholder="Contre-proposition (XAF)"
                    min="100"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleAction(async () => {
                      await returnsApi.counterProposal(returnId, Number(counterAmount));
                      setCounterAmount("");
                    })}
                    disabled={!counterAmount || actionLoading}
                    variant="outline"
                    size="sm"
                  >
                    Modifier
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-medium">Proposition envoyée</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(returnData.proposedAmount || 0)} — en attente de la réponse du Chercheur.
              </p>
            </CardContent>
          </Card>
        )
      )}

      {/* ═══════════════════════════════════════════════════════════
          §9-10 : PAYMENT_PENDING — paiement en séquestre
          ═══════════════════════════════════════════════════════════ */}
      {status === "PAYMENT_PENDING" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Sécuriser la restitution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-2">
              <p className="text-3xl font-bold text-primary">{formatCurrency(returnData.acceptedAmount || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Récompense Finder — conservée en séquestre</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              🔒 Les fonds ne seront libérés qu&apos;après confirmation de la restitution par les deux parties.
            </p>
            {isLoser ? (
              <Button onClick={() => handleAction(() => returnsApi.pay(returnId))} disabled={actionLoading} className="w-full" size="lg">
                <Wallet className="h-4 w-4 mr-2" />
                Payer et sécuriser la restitution
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                En attente du paiement du Chercheur...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          §11-12 : ESCROW_FUNDED / MISSION_READY — Commencer la mission
          ═══════════════════════════════════════════════════════════ */}
      {(status === "ESCROW_FUNDED" || status === "MISSION_READY") && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <Lock className="h-4 w-4" />
              Paiement sécurisé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <p className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> {formatCurrency(returnData.acceptedAmount || 0)} en séquestre
              </p>
              {returnData.meetingDate && (
                <p className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> {new Date(returnData.meetingDate).toLocaleString("fr")}
                </p>
              )}
              {returnData.meetingLocation && (
                <p className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> {returnData.meetingLocation}
                </p>
              )}
            </div>
            {isLoser && status === "ESCROW_FUNDED" && (
              <Button onClick={() => handleAction(() => returnsApi.startMission(returnId))} disabled={actionLoading} className="w-full" size="lg">
                <Navigation className="h-4 w-4 mr-1" />
                Commencer la mission
              </Button>
            )}
            {isLoser && status === "MISSION_READY" && (
              <Button onClick={() => handleAction(() => returnsApi.startMission(returnId))} disabled={actionLoading} className="w-full" size="lg">
                <Navigation className="h-4 w-4 mr-1" />
                Commencer la mission
              </Button>
            )}
            {isFinder && (
              <p className="text-sm text-muted-foreground text-center">
                En attente du démarrage de la mission par le Chercheur...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          §13-14 : MISSION_STARTED — position + « Je suis arrivé »
          ═══════════════════════════════════════════════════════════ */}
      {status === "MISSION_STARTED" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Mission démarrée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {returnData.meetingDate && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> {new Date(returnData.meetingDate).toLocaleString("fr")}</p>
                <p className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {returnData.meetingLocation}</p>
              </div>
            )}
            {isLoser && (
              <p className="text-sm text-muted-foreground text-center">
                Le Finder est en route. Vous serez notifié à son arrivée.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          §13/§20 : Partage de position (fenêtre de mission)
          ═══════════════════════════════════════════════════════════ */}
      <LocationSharingCard
        returnId={returnId}
        status={status}
        isLoser={isLoser}
        isFinder={isFinder}
        onArrived={() => handleAction(() => returnsApi.markArrival(returnId))}
        arrivalLoading={actionLoading}
      />

      {/* ═══════════════════════════════════════════════════════════
          §14-18 : MEETING_IN_PROGRESS / HANDOVER_PENDING — confirmations
          ═══════════════════════════════════════════════════════════ */}
      {(status === "MEETING_IN_PROGRESS" || status === "HANDOVER_PENDING") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {status === "MEETING_IN_PROGRESS" ? "Rendez-vous en cours" : "En attente des confirmations"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {status === "HANDOVER_PENDING" && (
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className={returnData.finderReturnConfirmed ? "text-green-600" : "text-muted-foreground"}>
                  {returnData.finderReturnConfirmed ? "✅" : "⏳"} Remise Finder
                </span>
                <span className={returnData.loserReturnConfirmed ? "text-green-600" : "text-muted-foreground"}>
                  {returnData.loserReturnConfirmed ? "✅" : "⏳"} Réception Chercheur
                </span>
              </div>
            )}
            {isFinder && !returnData.finderReturnConfirmed && (
              <Button onClick={() => handleAction(() => returnsApi.confirmHandover(returnId))} disabled={actionLoading} className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Confirmer la remise
              </Button>
            )}
            {isLoser && !returnData.loserReturnConfirmed && (
              <>
                <Button onClick={() => handleAction(() => returnsApi.confirmHandover(returnId))} disabled={actionLoading} className="w-full">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Confirmer la réception
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Confirmez uniquement si vous avez bien récupéré l&apos;objet.
                </p>
              </>
            )}
            <p className="text-xs text-muted-foreground text-center">
              🔒 Les fonds seront libérés automatiquement après les deux confirmations.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          §19-21 : COMPLETED — fonds libérés + évaluation
          ═══════════════════════════════════════════════════════════ */}
      {status === "COMPLETED" && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Restitution réussie 🎉
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-3">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(returnData.paymentAmount || 0)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isFinder ? "crédités sur votre portefeuille" : "versés au retrouveur"}
              </p>
              {returnData.platformFee && (
                <p className="text-xs text-muted-foreground">
                  Commission RetrouvIt : {formatCurrency(returnData.platformFee)} ({returnData.platformFeePct}%)
                </p>
              )}
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground text-center">
                🔒 Partage de position terminé — la localisation n&apos;est plus accessible.
              </p>
            </div>

            {!returnData.hasRating && (
              <div className="border-t pt-3 mt-3">
                <p className="text-sm font-medium mb-2">Comment s&apos;est passée votre restitution ? Notez {other.name} :</p>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRatingStars(star)}>
                      <Star className={`h-6 w-6 ${star <= ratingStars ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Votre commentaire (optionnel)..."
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  rows={2}
                  className="mb-2"
                />
                <Button onClick={() => handleAction(async () => {
                  await returnsApi.rate(returnId, ratingStars, ratingComment || undefined);
                })} disabled={actionLoading} className="w-full" size="sm">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3 w-3 mr-1" /> Publier mon avis</>}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          Sorties parallèles : REJECTED / DISPUTED / REFUNDED...
          ═══════════════════════════════════════════════════════════ */}
      {stepIndex === -1 && status !== "DISPUTED" && status !== "UNDER_REVIEW" && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              {status === "REJECTED" ? "Restitution refusée"
                : status === "REFUNDED" ? "Fonds remboursés"
                : status === "PAYMENT_FAILED" ? "Paiement échoué"
                : "Collaboration clôturée"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {status === "REJECTED"
                ? "Le Finder a refusé la mise en relation pour cette restitution."
                : status === "REFUNDED"
                ? `Votre paiement a été remboursé. ${returnData.disputeResolution ?? ""}`
                : "Cette collaboration est clôturée."}
            </p>
          </CardContent>
        </Card>
      )}

      {(status === "DISPUTED" || status === "UNDER_REVIEW") && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Litige {status === "UNDER_REVIEW" ? "en cours d'arbitrage" : "signalé"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">Raison : {returnData.disputeReason}</p>
            {returnData.disputeResolved && (
              <p className="text-sm text-green-600 font-medium">Résolu : {returnData.disputeResolution}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ Signaler un problème (§22) — sauf états terminaux ═══ */}
      {!["COMPLETED", "DISPUTED", "UNDER_REVIEW", "REJECTED", "CANCELLED", "REFUNDED", "RESOLVED"].includes(status) && (
        <div className="mt-6">
          {disputeReason ? (
            <Card className="border-destructive/50">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-destructive">Raison du problème :</p>
                <Textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Objet non conforme, fraude, non-restitution, montant contesté..."
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button onClick={() => handleAction(async () => {
                    await returnsApi.dispute(returnId, disputeReason);
                    setDisputeReason("");
                  })} disabled={actionLoading || !disputeReason} variant="destructive" size="sm">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Signaler"}
                  </Button>
                  <Button onClick={() => setDisputeReason("")} variant="ghost" size="sm">Annuler</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" onClick={() => setDisputeReason(" ")}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Signaler un problème
            </Button>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          §24 : Timeline de la collaboration
          ═══════════════════════════════════════════════════════════ */}
      {timeline.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Historique de la collaboration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeline.map((event) => (
                <div key={event.id} className="flex gap-3 text-sm">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div className="h-full w-px bg-border" />
                  </div>
                  <div className="pb-2">
                    <p className="text-xs font-medium">{event.description ?? event.eventType}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.actorName} · {new Date(event.createdAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
