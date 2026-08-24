"use client";

import * as React from "react";
import { AlertTriangle, Send, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { reportsApi } from "@/lib/api-admin";
import { showToast } from "@/lib/toast";

const reportReasons = [
  { value: "FAKE_LISTING", label: "Annonce fausse", icon: "🚫", description: "L'annonce semble inventée ou trompeuse" },
  { value: "SCAM", label: "Arnaque / Fraude", icon: "⚠️", description: "Tentative d'escroquerie ou de manipulation" },
  { value: "HARASSMENT", label: "Harcèlement", icon: "🛑", description: "Messages ou comportement inapproprié" },
  { value: "PAYMENT_DISPUTE", label: "Litige de paiement", icon: "💰", description: "Problème lié à une récompense ou un paiement" },
  { value: "IDENTITY", label: "Usurpation d'identité", icon: "🎭", description: "L'utilisateur se fait passer pour quelqu'un d'autre" },
  { value: "OTHER", label: "Autre raison", icon: "📝", description: "Autre motif non listé ci-dessus" },
];

interface ReportDialogProps {
  trigger: React.ReactNode;
  objectId: number;
  objectType: "lost" | "found";
  objectTitle: string;
  reportedUserId?: number;
}

export function ReportDialog({
  trigger,
  objectId,
  objectType,
  objectTitle,
  reportedUserId,
}: ReportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setIsSubmitting(true);
    try {
      await reportsApi.create({
        type: reason,
        subject: `Signalement : ${objectTitle}`,
        description: description || `Signalement de l'annonce "${objectTitle}"`,
        reportedUserId,
        ...(objectType === "lost" ? { lostObjectId: objectId } : { foundObjectId: objectId }),
      });
      setSuccess(true);
      showToast({
        title: "Signalement envoyé",
        description: "Merci pour votre signalement. Notre équipe va l'examiner.",
        type: "SUCCESS",
      });
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setReason("");
        setDescription("");
      }, 1500);
    } catch {
      showToast({
        title: "Erreur",
        description: "Impossible d'envoyer le signalement. Réessayez.",
        type: "ADMIN_ALERT",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setSuccess(false);
      setReason("");
      setDescription("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {success ? (
          <div className="py-12 text-center space-y-4 animate-scale-in">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-forest/10">
              <CheckCircle2 className="h-8 w-8 text-forest" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Signalement envoyé !</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Notre équipe va examiner votre signalement.
              </p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-brand/10">
                  <AlertTriangle className="h-4 w-4 text-orange-brand" />
                </div>
                Signaler cette annonce
              </DialogTitle>
              <DialogDescription>
                Pourquoi signalez-vous &ldquo;{objectTitle}&rdquo; ?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <RadioGroup value={reason} onValueChange={setReason}>
                <div className="space-y-2">
                  {reportReasons.map((r) => (
                    <label
                      key={r.value}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all",
                        reason === r.value
                          ? "border-orange-brand bg-orange-brand/5 shadow-sm"
                          : "hover:border-muted-foreground/30 hover:bg-muted/50"
                      )}
                    >
                      <RadioGroupItem value={r.value} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{r.icon}</span>
                          <span className="text-sm font-medium">{r.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </RadioGroup>

              <div>
                <Label htmlFor="report-desc" className="text-sm font-medium">
                  Description <span className="text-muted-foreground">(optionnel)</span>
                </Label>
                <Textarea
                  id="report-desc"
                  placeholder="Ajoutez des détails pour aider notre équipe..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1.5 rounded-xl resize-none"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!reason || isSubmitting}
                className="rounded-xl bg-orange-brand hover:bg-orange-brand/90 text-white"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1.5" />
                )}
                Envoyer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
