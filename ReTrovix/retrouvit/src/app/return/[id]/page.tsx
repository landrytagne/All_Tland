"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { returnsApi, type ReturnRequestResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageCircle,
  DollarSign,
  CheckCircle2,
  Calendar,
  MapPin,
  Navigation,
  Star,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Clock,
  Shield,
  CreditCard,
  UserCheck,
  XCircle,
  Send,
} from "lucide-react";

type Step =
  | "initiated"
  | "reward"
  | "validating"
  | "appointment"
  | "returning"
  | "confirming"
  | "completed"
  | "disputed";

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: "initiated", label: "Chat démarré", icon: MessageCircle },
  { key: "reward", label: "Récompense", icon: DollarSign },
  { key: "validating", label: "Validation", icon: CheckCircle2 },
  { key: "appointment", label: "Rendez-vous", icon: Calendar },
  { key: "returning", label: "Restitution", icon: Navigation },
  { key: "confirming", label: "Confirmation", icon: Shield },
  { key: "completed", label: "Terminé", icon: CreditCard },
];

export default function ReturnFlowPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [returnData, setReturnData] = React.useState<ReturnRequestResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [rewardAmount, setRewardAmount] = React.useState("");
  const [meetingDate, setMeetingDate] = React.useState("");
  const [meetingLocation, setMeetingLocation] = React.useState("");
  const [disputeReason, setDisputeReason] = React.useState("");
  const [ratingStars, setRatingStars] = React.useState(5);
  const [ratingComment, setRatingComment] = React.useState("");

  const returnId = Number(params.id);
  const isLoser = user?.id === returnData?.loser.id;
  const isFinder = user?.id === returnData?.finder.id;

  const fetchReturn = React.useCallback(async () => {
    try {
      const data = await returnsApi.getById(returnId);
      setReturnData(data);
    } catch (err) {
      console.error("Failed to fetch return:", err);
    } finally {
      setLoading(false);
    }
  }, [returnId]);

  React.useEffect(() => {
    fetchReturn();
  }, [fetchReturn]);

  const getCurrentStep = (): Step => {
    if (!returnData) return "initiated";
    const s = returnData.status;
    if (s === "PAYMENT_COMPLETED" || s === "DISPUTE_RESOLVED") return "completed";
    if (s === "DISPUTED") return "disputed";
    if (s === "RETURN_CONFIRMED" || s === "RETURN_IN_PROGRESS") return "returning";
    if (s === "APPOINTMENT_SET") return "appointment";
    if (s === "BOTH_VALIDATED") return "validating";
    if (s === "REWARD_ACCEPTED" || s === "REWARD_PROPOSED") return "reward";
    return "initiated";
  };

  const currentStep = getCurrentStep();
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const handleProposeReward = async () => {
    if (!rewardAmount || !returnData) return;
    setActionLoading(true); setActionError(null);
    try {
      const data = await returnsApi.proposeReward(returnData.id, Number(rewardAmount));
      setReturnData(data);
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de la proposition");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptReward = async () => {
    if (!returnData) return;
    const amount = returnData.proposedAmount || 0;
    if (amount <= 0) { setActionError("Montant de récompense invalide"); return; }
    setActionLoading(true); setActionError(null);
    try {
      const data = await returnsApi.acceptReward(returnData.id, amount);
      setReturnData(data);
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de l'action");
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!returnData) return;
    setActionLoading(true); setActionError(null);
    try {
      const data = await returnsApi.validate(returnData.id);
      setReturnData(data);
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de l'action");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetAppointment = async () => {
    if (!returnData || !meetingDate || !meetingLocation) return;
    setActionLoading(true); setActionError(null);
    try {
      const data = await returnsApi.setAppointment(returnData.id, {
        meetingDate: meetingDate,
        meetingLocation,
      });
      setReturnData(data);
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de l'action");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!returnData) return;
    setActionLoading(true); setActionError(null);
    try {
      const data = await returnsApi.confirmReturn(returnData.id);
      setReturnData(data);
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de l'action");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartReturn = async () => {
    if (!returnData) return;
    setActionLoading(true); setActionError(null);
    try {
      const data = await returnsApi.startReturn(returnData.id);
      setReturnData(data);
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de l'action");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!returnData || !disputeReason) return;
    setActionLoading(true); setActionError(null);
    try {
      const data = await returnsApi.dispute(returnData.id, disputeReason);
      setReturnData(data);
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de l'action");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRate = async () => {
    if (!returnData) return;
    setActionLoading(true); setActionError(null);
    try {
      await returnsApi.rate(returnData.id, ratingStars, ratingComment || undefined);
      await fetchReturn(); // Refresh
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de l'action");
    } finally {
      setActionLoading(false);
    }
  };

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
  const formatCurrency = (n: number) => new Intl.NumberFormat("fr-CM").format(n) + " XAF";

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
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone
                        ? "bg-primary text-primary-foreground"
                        : isActive
                        ? "bg-primary/20 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
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
        <Badge variant={currentStep === "completed" ? "success" : currentStep === "disputed" ? "destructive" : "warning"}>
          {returnData.status.replace(/_/g, " ")}
        </Badge>
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

      {/* ─── Step Content ─────────────────────────────────── */}

      {/* Step 1: Chat Initiated */}
      {currentStep === "initiated" && isFinder && returnData.proposedAmount == null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {locale === "fr" ? "Proposer une récompense" : "Propose a reward (from owner)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {locale === "fr"
                ? "En attente que le propriétaire propose une récompense..."
                : "Waiting for the owner to propose a reward..."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Reward */}
      {currentStep === "initiated" && isLoser && returnData.proposedAmount == null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {locale === "fr" ? "Proposer une récompense" : "Propose a reward"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {locale === "fr"
                ? "Proposez la récompense que vous souhaitez offrir au retrouveur."
                : "Propose the reward you wish to offer the finder."}
            </p>
            <Input
              type="number"
              placeholder="Montant en XAF"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
            />
            <Button onClick={handleProposeReward} disabled={!rewardAmount || actionLoading} className="w-full">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Proposer la récompense"}
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === "reward" && returnData.status === "REWARD_PROPOSED" && isFinder && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {locale === "fr" ? "Accepter la récompense" : "Accept the reward"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-primary">{formatCurrency(returnData.proposedAmount || 0)}</p>
              <p className="text-sm text-muted-foreground mt-1">Récompense proposée</p>
            </div>
            <Button onClick={handleAcceptReward} disabled={actionLoading} className="w-full">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accepter et créer l'escrow"}
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === "reward" && returnData.status === "REWARD_ACCEPTED" && (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {locale === "fr"
                ? "Récompense acceptée. {amount} XAF en séquestre. Validez la collaboration."
                    .replace("{amount}", String(formatCurrency(returnData.acceptedAmount || 0)))
                : "Reward accepted. Funds in escrow. Please validate the collaboration."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Validation */}
      {(currentStep === "reward" && returnData.status === "REWARD_ACCEPTED") ||
      currentStep === "validating" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              {locale === "fr" ? "Valider la collaboration" : "Validate collaboration"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              {returnData.loserValidated ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{returnData.loser.name} — {returnData.loserValidated ? "Validé" : "En attente"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {returnData.finderValidated ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{returnData.finder.name} — {returnData.finderValidated ? "Validé" : "En attente"}</span>
            </div>
            {!returnData.isFullyValidated && ((isLoser && !returnData.loserValidated) || (isFinder && !returnData.finderValidated)) && (
              <Button onClick={handleValidate} disabled={actionLoading} className="w-full">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (locale === "fr" ? "Valider ma partie" : "Validate my part")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Step 4: Appointment */}
      {currentStep === "appointment" || (currentStep === "validating" && returnData.isFullyValidated) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {returnData.meetingDate ? "Rendez-vous fixé" : "Fixer un rendez-vous"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {returnData.meetingDate ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{new Date(returnData.meetingDate).toLocaleString("fr")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{returnData.meetingLocation}</span>
                </div>
                <Button onClick={handleStartReturn} disabled={actionLoading} className="w-full mt-4">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Je suis en route"}
                </Button>
              </>
            ) : (
              <>
                <DateTimePicker
                  value={meetingDate}
                  onChange={setMeetingDate}
                  placeholder="Choisir la date et heure du rendez-vous"
                />
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    value={meetingLocation}
                    onChange={(e) => setMeetingLocation(e.target.value)}
                    placeholder="Lieu du rendez-vous (ex: Carrefour Warda, Douala)"
                    className="pl-9"
                  />
                </div>
                <Button
                  onClick={handleSetAppointment}
                  disabled={!meetingDate || !meetingLocation || actionLoading}
                  className="w-full"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fixer le rendez-vous"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Step 5: Return in progress */}
      {currentStep === "returning" && returnData.status === "RETURN_IN_PROGRESS" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              {locale === "fr" ? "Restitution en cours" : "Return in progress"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {locale === "fr"
                ? "Le retrouveur est en route. Une fois l'objet remis, confirmez la restitution."
                : "The finder is on the way. Once the item is handed over, confirm the return."}
            </p>
            {returnData.meetingLocation && (
              <div className="flex items-center gap-2 text-sm p-2 bg-muted rounded-lg">
                <MapPin className="h-4 w-4" />
                <span>{returnData.meetingLocation}</span>
              </div>
            )}
            <Button onClick={handleConfirmReturn} disabled={actionLoading} className="w-full" variant="default">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer la restitution"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 5b: Awaiting confirmation */}
      {currentStep === "returning" && returnData.status !== "RETURN_IN_PROGRESS" && (
        <Card>
          <CardContent className="p-4 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {locale === "fr"
                ? "En attente de confirmation de {other}..."
                    .replace("{other}", other.name)
                : "Waiting for confirmation from " + other.name + "..."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Completed */}
      {currentStep === "completed" && returnData.status === "PAYMENT_COMPLETED" && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              {locale === "fr" ? "Échange terminé !" : "Exchange completed!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-3">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(returnData.paymentAmount || 0)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isFinder ? "versé sur votre portefeuille" : "payé au retrouveur"}
              </p>
              <p className="text-xs text-muted-foreground">
                Frais plateforme : {formatCurrency(returnData.platformFee || 0)} ({returnData.platformFeePct}%)
              </p>
            </div>

            {/* Rating */}
            {!returnData.hasRating && (
              <div className="border-t pt-3 mt-3">
                <p className="text-sm font-medium mb-2">Notez {other.name} :</p>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRatingStars(star)}>
                      <Star
                        className={`h-6 w-6 ${
                          star <= ratingStars ? "text-amber-400 fill-amber-400" : "text-muted-foreground"
                        }`}
                      />
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
                <Button onClick={handleRate} disabled={actionLoading} className="w-full" size="sm">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3 w-3 mr-1" /> Envoyer</>}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dispute Button (visible at any time before completion) */}
      {currentStep !== "completed" && currentStep !== "disputed" && (
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
                  <Button onClick={() => setDisputeReason("")} variant="ghost" size="sm">
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setDisputeReason(" ")}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {locale === "fr" ? "Signaler un litige" : "Report a dispute"}
            </Button>
          )}
        </div>
      )}

      {/* Disputed State */}
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
    </div>
  );
}
