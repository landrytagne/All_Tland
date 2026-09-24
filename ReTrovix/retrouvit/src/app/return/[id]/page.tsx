"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { returnsApi, type ReturnRequestResponse } from "@/lib/api";
import { proofsApi, negotiationApi, type ProofResponse, type NegotiationOfferResponse } from "@/lib/api-proof";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle, DollarSign, CheckCircle2, Calendar, MapPin,
  Navigation, Star, AlertTriangle, Loader2, ArrowRight, Clock,
  Shield, CreditCard, UserCheck, XCircle, Send, FileSearch,
  Lock, Eye, Upload, AlertCircle, Wallet, Ban, MessageSquare,
} from "lucide-react";

type Step =
  | "proof"
  | "review"
  | "negotiating"
  | "payment"
  | "collaboration"
  | "returning"
  | "confirming"
  | "releasing"
  | "completed"
  | "disputed"
  | "rejected";

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: "proof", label: "Preuves", icon: FileSearch },
  { key: "review", label: "Validation", icon: Eye },
  { key: "negotiating", label: "Négociation", icon: DollarSign },
  { key: "payment", label: "Paiement", icon: Wallet },
  { key: "collaboration", label: "Collaboration", icon: MessageCircle },
  { key: "returning", label: "Restitution", icon: Navigation },
  { key: "confirming", label: "Confirmation", icon: Shield },
  { key: "releasing", label: "Libération", icon: CreditCard },
  { key: "completed", label: "Terminé", icon: CheckCircle2 },
];

// ═══════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════

export default function ReturnFlowPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [returnData, setReturnData] = React.useState<ReturnRequestResponse | null>(null);
  const [proofs, setProofs] = React.useState<ProofResponse[]>([]);
  const [negotiationHistory, setNegotiationHistory] = React.useState<NegotiationOfferResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Proof form state
  const [proofDescription, setProofDescription] = React.useState("");
  const [proofCharacteristics, setProofCharacteristics] = React.useState("");
  const [proofCondition, setProofCondition] = React.useState("");
  const [proofLocation, setProofLocation] = React.useState("");
  const [proofSerial, setProofSerial] = React.useState("");
  const [proofPhotos, setProofPhotos] = React.useState("");

  // Review state
  const [reviewNote, setReviewNote] = React.useState("");
  const [rejectReason, setRejectReason] = React.useState("");

  // Negotiation state
  const [negotiateAmount, setNegotiateAmount] = React.useState("");
  const [negotiateMessage, setNegotiateMessage] = React.useState("");

  // Appointment state
  const [meetingDate, setMeetingDate] = React.useState("");
  const [meetingLocation, setMeetingLocation] = React.useState("");

  // Dispute state
  const [disputeReason, setDisputeReason] = React.useState("");

  // Rating state
  const [ratingStars, setRatingStars] = React.useState(5);
  const [ratingComment, setRatingComment] = React.useState("");

  const returnId = Number(params.id);
  const isLoser = user?.id === returnData?.loser.id;
  const isFinder = user?.id === returnData?.finder.id;

  const fetchReturn = React.useCallback(async () => {
    try {
      const data = await returnsApi.getById(returnId);
      setReturnData(data);
      // Fetch proof and negotiation data
      const [proofsData, negotiationData] = await Promise.all([
        proofsApi.getByReturnId(returnId).catch(() => []),
        negotiationApi.getHistory(returnId).catch(() => []),
      ]);
      setProofs(proofsData);
      setNegotiationHistory(negotiationData);
    } catch (err) {
      console.error("Failed to fetch return:", err);
    } finally {
      setLoading(false);
    }
  }, [returnId]);

  React.useEffect(() => { fetchReturn(); }, [fetchReturn]);

  // ═══ Step determination ═══
  const getCurrentStep = (): Step => {
    if (!returnData) return "proof";
    const s = returnData.status;
    if (s === "COMPLETED" || s === "RELEASED" || s === "PAYMENT_COMPLETED") return "completed";
    if (s === "DISPUTED" || s === "SUPPORT_REVIEW") return "disputed";
    if (s === "REJECTED" || s === "CANCELLED") return "rejected";
    if (s === "RELEASE_PENDING" || s === "RELEASED") return "releasing";
    if (s === "RETURN_CONFIRMED" || s === "RETURN_IN_PROGRESS") return "returning";
    if (s === "COLLABORATION_ACTIVE") return "collaboration";
    if (s === "PAYMENT_LOCKED" || s === "PAYMENT_PENDING") return "payment";
    if (s === "REWARD_ACCEPTED") return "payment";
    if (s === "NEGOTIATING" || s === "REWARD_PROPOSED") return "negotiating";
    if (s === "OWNER_CONFIRMED") return "negotiating";
    if (s === "NEED_MORE_INFO" || s === "PROOF_SUBMITTED") return "review";
    if (s === "MATCH_FOUND") return "proof";
    return "proof";
  };

  const currentStep = getCurrentStep();
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  // ═══ Action handlers ═══
  const handleAction = async (action: () => Promise<any>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await action();
      await fetchReturn();
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de l'action");
    } finally {
      setActionLoading(false);
    }
  };

  // Proof submission
  const handleSubmitProof = () => handleAction(async () => {
    await proofsApi.submit(returnId, {
      description: proofDescription,
      characteristics: proofCharacteristics,
      condition: proofCondition,
      discoveryLocation: proofLocation,
      serialNumber: proofSerial || undefined,
      photos: proofPhotos || undefined,
    });
  });

  // Review actions
  const handleConfirmOwnership = () => handleAction(() => proofsApi.confirmOwnership(returnId));
  const handleRequestMoreInfo = () => handleAction(() => proofsApi.requestMoreInfo(returnId, reviewNote));
  const handleRejectProof = () => handleAction(() => proofsApi.reject(returnId, rejectReason));

  // Negotiation
  const handlePropose = () => handleAction(async () => {
    await negotiationApi.propose(returnId, Number(negotiateAmount), negotiateMessage || undefined);
  });
  const handleCounter = () => handleAction(async () => {
    await negotiationApi.counter(returnId, Number(negotiateAmount), negotiateMessage || undefined);
  });
  const handleAcceptNegotiation = () => handleAction(() => negotiationApi.accept(returnId));
  const handleRejectNegotiation = () => handleAction(() => negotiationApi.reject(returnId));

  // Payment & collaboration
  const handlePay = () => handleAction(() => returnsApi.pay(returnId));
  const handleActivateCollaboration = () => handleAction(() => returnsApi.activateCollaboration(returnId));

  // Appointment & return
  const handleSetAppointment = () => handleAction(() =>
    returnsApi.setAppointment(returnId, { meetingDate, meetingLocation })
  );
  const handleStartReturn = () => handleAction(() => returnsApi.startReturn(returnId));
  const handleConfirmReturn = () => handleAction(() => returnsApi.confirmReturn(returnId));
  const handleReleasePayment = () => handleAction(() => returnsApi.release(returnId));

  // Dispute
  const handleDispute = () => handleAction(() => returnsApi.dispute(returnId, disputeReason));

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
        <p className="text-muted-foreground">Demande de retour non trouvée</p>
      </div>
    );
  }

  const other = isLoser ? returnData.finder : returnData.loser;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-6 px-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-3">
          ← {t("common.back")}
        </Button>
        <h1 className="text-xl font-bold">{returnData.reference}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoser ? "Objet trouvé par " : "Propriétaire : "}{other.name}
        </p>
      </div>

      {/* Progress Steps */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = i === currentStepIndex;
              const isDone = i < currentStepIndex;
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

      {/* Status Badge */}
      <div className="flex items-center gap-2 mb-4">
        <Badge variant={
          currentStep === "completed" ? "success"
            : currentStep === "disputed" ? "destructive"
            : currentStep === "rejected" ? "destructive"
            : "warning"
        }>
          {returnData.status.replace(/_/g, " ")}
        </Badge>
        {returnData.acceptedAmount && (
          <Badge variant="outline">{formatCurrency(returnData.acceptedAmount)} accepté</Badge>
        )}
        {returnData.paymentAmount && (
          <Badge variant="success">{formatCurrency(returnData.paymentAmount)} payé</Badge>
        )}
      </div>

      {/* Error feedback */}
      {actionError && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-destructive flex-1">{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-destructive hover:opacity-70">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          STEP: Proof Submission (Finder)
          ═══════════════════════════════════════════════════════════ */}
      {currentStep === "proof" && isFinder && (returnData.status === "MATCH_FOUND" || returnData.status === "NEED_MORE_INFO") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {locale === "fr" ? "Soumettre les preuves" : "Submit proof"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {locale === "fr"
                ? "Décrivez l'objet trouvé avec le maximum de détails pour prouver sa correspondance."
                : "Describe the found object with as much detail as possible."}
            </p>

            {returnData.status === "NEED_MORE_INFO" && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ Le propriétaire a demandé des informations supplémentaires.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Description détaillée *</label>
              <Textarea
                value={proofDescription}
                onChange={(e) => setProofDescription(e.target.value)}
                placeholder="Décrivez l'objet : marque, modèle, couleur, état..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Caractéristiques physiques</label>
              <Input
                value={proofCharacteristics}
                onChange={(e) => setProofCharacteristics(e.target.value)}
                placeholder="Couleur, taille, poids, material..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">État de l'objet</label>
              <Input
                value={proofCondition}
                onChange={(e) => setProofCondition(e.target.value)}
                placeholder="Neuf, usé, endommagé..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Lieu de découverte *</label>
              <Input
                value={proofLocation}
                onChange={(e) => setProofLocation(e.target.value)}
                placeholder="Ex: Carrefour Warda, Douala"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Numéro de série / IMEI</label>
              <Input
                value={proofSerial}
                onChange={(e) => setProofSerial(e.target.value)}
                placeholder="Optionnel - numéros d'identification"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Informations techniques</label>
              <Textarea
                value={proofPhotos}
                onChange={(e) => setProofPhotos(e.target.value)}
                placeholder="Informations complémentaires..."
                rows={2}
              />
            </div>

            <Button
              onClick={handleSubmitProof}
              disabled={!proofDescription || !proofLocation || actionLoading}
              className="w-full"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              {locale === "fr" ? "Envoyer les preuves" : "Submit proof"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ═══ Waiting for proof (Owner view) ═══ */}
      {currentStep === "proof" && isLoser && returnData.status === "MATCH_FOUND" && (
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-sm font-medium">En attente des preuves du retrouveur...</p>
            <p className="text-xs text-muted-foreground mt-1">{other.name} soumet ses preuves de possession.</p>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          STEP: Review Proof (Owner)
          ═══════════════════════════════════════════════════════════ */}
      {currentStep === "review" && returnData.status === "PROOF_SUBMITTED" && isLoser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Vérifier les preuves
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {proofs.length > 0 && (
              <div className="space-y-3">
                {proofs.filter(p => p.status === "SUBMITTED").map((proof) => (
                  <div key={proof.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <p className="text-sm"><strong>Description :</strong> {proof.description}</p>
                    {proof.characteristics && <p className="text-sm"><strong>Caractéristiques :</strong> {proof.characteristics}</p>}
                    {proof.condition && <p className="text-sm"><strong>État :</strong> {proof.condition}</p>}
                    {proof.discoveryLocation && <p className="text-sm"><strong>Lieu :</strong> {proof.discoveryLocation}</p>}
                    {proof.serialNumber && <p className="text-sm"><strong>N° série :</strong> {proof.serialNumber}</p>}
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="flex gap-2">
              <Button onClick={handleConfirmOwnership} disabled={actionLoading} className="flex-1 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Oui, c'est mon objet
              </Button>
            </div>

            <div className="space-y-2">
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Demandez des informations supplémentaires..."
                rows={2}
              />
              <Button
                onClick={handleRequestMoreInfo}
                disabled={!reviewNote || actionLoading}
                variant="outline"
                className="w-full"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Demander plus d'infos
              </Button>
            </div>

            <div className="space-y-2">
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Raison du rejet..."
                rows={2}
              />
              <Button
                onClick={handleRejectProof}
                disabled={!rejectReason || actionLoading}
                variant="destructive"
                className="w-full"
              >
                <Ban className="h-4 w-4 mr-1" />
                Non, ce n'est pas mon objet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Waiting for review (Finder) ═══ */}
      {currentStep === "review" && isFinder && returnData.status === "PROOF_SUBMITTED" && (
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-sm font-medium">En attente de vérification...</p>
            <p className="text-xs text-muted-foreground mt-1">{other.name} examine vos preuves.</p>
          </CardContent>
        </Card>
      )}

      {/* ═══ Rejected state ═══ */}
      {currentStep === "rejected" && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              {returnData.status === "CANCELLED" ? "Négociation refusée" : "Preuves rejetées"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {returnData.status === "REJECTED"
                ? "Le propriétaire n'a pas reconnu l'objet."
                : "La négociation a été refusée par l'une des parties."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          STEP: Negotiation
          ═══════════════════════════════════════════════════════════ */}
      {(currentStep === "negotiating" || returnData.status === "OWNER_CONFIRMED" || returnData.status === "NEGOTIATING") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {locale === "fr" ? "Négociation de la récompense" : "Reward negotiation"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show current proposed amount */}
            {returnData.proposedAmount && (
              <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Montant proposé</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(returnData.proposedAmount)}</p>
              </div>
            )}

            {/* Negotiation history */}
            {negotiationHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Historique</p>
                {negotiationHistory.map((offer) => (
                  <div key={offer.id} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                    offer.status === "ACCEPTED" ? "bg-green-50 dark:bg-green-950/20"
                      : offer.status === "REJECTED" ? "bg-red-50 dark:bg-red-950/20"
                      : offer.status === "COUNTERED" ? "bg-amber-50 dark:bg-amber-950/20"
                      : "bg-muted/50"
                  }`}>
                    <Badge variant={offer.status === "ACCEPTED" ? "success" : offer.status === "REJECTED" ? "destructive" : "secondary"} className="text-[10px]">
                      {offer.status}
                    </Badge>
                    <span className="font-medium">{formatCurrency(offer.amount)}</span>
                    <span className="text-muted-foreground ml-auto text-xs">
                      par {offer.offeredById === user?.id ? "vous" : other.name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Propose / Counter */}
            {returnData.status !== "REWARD_ACCEPTED" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={negotiateAmount}
                    onChange={(e) => setNegotiateAmount(e.target.value)}
                    placeholder="Montant en XAF"
                    min="100"
                    className="flex-1"
                  />
                  <span className="flex items-center text-sm text-muted-foreground">FCFA</span>
                </div>
                <Input
                  value={negotiateMessage}
                  onChange={(e) => setNegotiateMessage(e.target.value)}
                  placeholder="Message (optionnel)"
                />

                {returnData.status === "OWNER_CONFIRMED" && isLoser && (
                  <Button onClick={handlePropose} disabled={!negotiateAmount || actionLoading} className="w-full">
                    Proposer la récompense
                  </Button>
                )}
                {returnData.status === "NEGOTIATING" && (
                  <div className="flex gap-2">
                    <Button onClick={handleAcceptNegotiation} disabled={actionLoading} className="flex-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Accepter
                    </Button>
                    <Button onClick={handleCounter} disabled={!negotiateAmount || actionLoading} className="flex-1" variant="outline">
                      Contre-proposer
                    </Button>
                    <Button onClick={handleRejectNegotiation} disabled={actionLoading} variant="destructive">
                      <XCircle className="h-4 w-4 mr-1" /> Refuser
                    </Button>
                  </div>
                )}
              </div>
            )}

            {returnData.status === "REWARD_ACCEPTED" && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  ✅ Récompense de {formatCurrency(returnData.acceptedAmount || 0)} acceptée !
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          STEP: Payment
          ═══════════════════════════════════════════════════════════ */}
      {(currentStep === "payment" || returnData.status === "REWARD_ACCEPTED" || returnData.status === "PAYMENT_LOCKED") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {returnData.status === "PAYMENT_LOCKED"
                ? "Paiement sécurisé ✅"
                : "Sécuriser le paiement"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {returnData.status === "PAYMENT_LOCKED" ? (
              <div className="space-y-3">
                <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <Lock className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-green-600">{formatCurrency(returnData.acceptedAmount || 0)}</p>
                  <p className="text-xs text-green-600/80 mt-1">Sécurisés en escrow</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Le montant est verrouillé. Vous pouvez maintenant activer la collaboration.
                </p>
                <Button onClick={handleActivateCollaboration} disabled={actionLoading} className="w-full">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Activer la collaboration
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-center py-3">
                  <p className="text-3xl font-bold text-primary">{formatCurrency(returnData.acceptedAmount || 0)}</p>
                  <p className="text-sm text-muted-foreground mt-1">Montant à payer</p>
                </div>

                {isLoser ? (
                  <Button onClick={handlePay} disabled={actionLoading} className="w-full" size="lg">
                    <Wallet className="h-4 w-4 mr-2" />
                    Payer depuis mon portefeuille
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    En attente du paiement du propriétaire...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          STEP: Collaboration Active
          ═══════════════════════════════════════════════════════════ */}
      {(currentStep === "collaboration" || returnData.status === "COLLABORATION_ACTIVE") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Collaboration active
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              La messagerie est ouverte. Organisez la restitution avec {other.name}.
            </p>
            <Button onClick={() => router.push("/messages")} className="w-full">
              <MessageCircle className="h-4 w-4 mr-1" />
              Ouvrir la messagerie
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          STEP: Returning
          ═══════════════════════════════════════════════════════════ */}
      {(currentStep === "returning" || returnData.status === "RETURN_IN_PROGRESS" || returnData.status === "RETURN_CONFIRMED") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              {returnData.status === "RETURN_CONFIRMED" ? "Retour confirmé ✅" : "Restitution en cours"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {returnData.meetingDate && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> {new Date(returnData.meetingDate).toLocaleString("fr")}</p>
                <p className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {returnData.meetingLocation}</p>
              </div>
            )}

            {returnData.status === "RETURN_IN_PROGRESS" && (
              <Button onClick={handleConfirmReturn} disabled={actionLoading} className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Confirmer la restitution
              </Button>
            )}

            {returnData.status === "RETURN_CONFIRMED" && (
              <Button onClick={handleReleasePayment} disabled={actionLoading} className="w-full bg-green-600 hover:bg-green-700">
                <CreditCard className="h-4 w-4 mr-1" />
                Libérer le paiement
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          STEP: Completed
          ═══════════════════════════════════════════════════════════ */}
      {currentStep === "completed" && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Échange terminé !
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-3">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(returnData.paymentAmount || 0)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isFinder ? "versé sur votre portefeuille" : "payé au retrouveur"}
              </p>
              {returnData.platformFee && (
                <p className="text-xs text-muted-foreground">
                  Frais plateforme : {formatCurrency(returnData.platformFee)} ({returnData.platformFeePct}%)
                </p>
              )}
            </div>

            {/* Rating */}
            {!returnData.hasRating && (
              <div className="border-t pt-3 mt-3">
                <p className="text-sm font-medium mb-2">Notez {other.name} :</p>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRatingStars(star)}>
                      <Star className={`h-6 w-6 ${star <= ratingStars ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Commentaire optionnel..."
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  rows={2}
                  className="mb-2"
                />
                <Button onClick={() => handleAction(async () => {
                  await returnsApi.rate(returnId, ratingStars, ratingComment || undefined);
                })} disabled={actionLoading} className="w-full" size="sm">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3 w-3 mr-1" /> Envoyer</>}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          STEP: Disputed
          ═══════════════════════════════════════════════════════════ */}
      {currentStep === "disputed" && (
        <Card className="border-destructive/50 mt-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Litige en cours
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

      {/* ═══ Dispute Button ═══ */}
      {!["completed", "disputed", "rejected", "REJECTED", "CANCELLED"].includes(currentStep)
        && returnData.status !== "COMPLETED"
        && returnData.status !== "RELEASED"
        && returnData.status !== "PAYMENT_COMPLETED" && (
        <div className="mt-6">
          {disputeReason ? (
            <Card className="border-destructive/50">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-destructive">Raison du litige :</p>
                <Textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Décrivez le problème..."
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button onClick={handleDispute} disabled={actionLoading || !disputeReason} variant="destructive" size="sm">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Signaler"}
                  </Button>
                  <Button onClick={() => setDisputeReason("")} variant="ghost" size="sm">Annuler</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" onClick={() => setDisputeReason(" ")}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              {locale === "fr" ? "Signaler un litige" : "Report a dispute"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
