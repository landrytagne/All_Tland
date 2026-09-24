"use client";

import * as React from "react";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Clock,
  Upload,
  FileText,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Award,
  Star,
  RefreshCw,
  Info,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import {
  apiRequest,
  certificationApi,
  type CertificationResponse,
  type CertificationEligibility,
} from "@/lib/api-core";

type CertificationStep = "eligibility" | "submit" | "pending" | "result";

function CertificationContent() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const [step, setStep] = React.useState<CertificationStep>("eligibility");
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [eligibility, setEligibility] = React.useState<CertificationEligibility | null>(null);
  const [myRequests, setMyRequests] = React.useState<CertificationResponse[]>([]);
  const [latestRequest, setLatestRequest] = React.useState<CertificationResponse | null>(null);

  // Form state
  const [documentType, setDocumentType] = React.useState("");
  const [documentUrl, setDocumentUrl] = React.useState("");
  const [selfieUrl, setSelfieUrl] = React.useState("");
  const [uploadingDoc, setUploadingDoc] = React.useState(false);
  const [uploadingSelfie, setUploadingSelfie] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Drag-and-drop state
  const [docDragging, setDocDragging] = React.useState(false);
  const [selfieDragging, setSelfieDragging] = React.useState(false);
  const docInputRef = React.useRef<HTMLInputElement>(null);
  const selfieInputRef = React.useRef<HTMLInputElement>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [elig, requests, latest] = await Promise.all([
        certificationApi.checkEligibility(),
        certificationApi.getMyRequests().catch(() => []),
        certificationApi.getMyLatest().catch(() => null),
      ]);
      setEligibility(elig);
      setMyRequests(requests);
      setLatestRequest(latest);

      // Determine which step to show
      if (user?.verified) {
        setStep("result");
      } else if (latest?.status === "PENDING") {
        setStep("pending");
      } else if (latest?.status === "APPROVED") {
        setStep("result");
      } else if (latest?.status === "REJECTED" || latest?.status === "CANCELLED" || !latest) {
        setStep("eligibility");
      }
    } catch (err) {
      console.error("Failed to load certification data:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.verified]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uploadToServer = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await apiRequest<{ url: string; filename: string }>("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      return response.url;
    } catch (err) {
      console.error("Upload failed:", err);
      return null;
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const url = await uploadToServer(file);
      if (url) setDocumentUrl(url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleUploadSelfie = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSelfie(true);
    try {
      const url = await uploadToServer(file);
      if (url) setSelfieUrl(url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploadingSelfie(false);
    }
  };

  // Generic file processor for drag-and-drop
  const processFile = async (
    file: File,
    setter: (url: string) => void,
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    try {
      const url = await uploadToServer(file);
      if (url) setter(url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  // Document drag handlers
  const handleDocDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDocDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file, setDocumentUrl, setUploadingDoc);
  };

  // Selfie drag handlers
  const handleSelfieDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelfieDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file, setSelfieUrl, setUploadingSelfie);
  };

  const handleSubmitRequest = async () => {
    if (!documentType || !documentUrl) return;
    try {
      setSubmitting(true);
      await certificationApi.submitRequest({
        documentType,
        documentUrl,
        selfieUrl: selfieUrl || undefined,
      });
      setSuccess(true);
      await fetchData();
    } catch (err: any) {
      console.error("Submit failed:", err);
      alert(err.message || "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!latestRequest) return;
    try {
      await certificationApi.cancelRequest(latestRequest.id);
      await fetchData();
    } catch (err: any) {
      console.error("Cancel failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          {user?.verified ? (
            <ShieldCheck className="h-8 w-8 text-white" />
          ) : (
            <Shield className="h-8 w-8 text-white" />
          )}
        </div>
        <h1 className="text-2xl font-bold">{t("certification.title")}</h1>
        <p className="text-muted-foreground">{t("certification.description")}</p>
      </div>

      {/* Already verified */}
      {user?.verified && step === "result" && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="p-6 text-center space-y-4">
            <ShieldCheck className="h-16 w-16 text-green-600 mx-auto" />
            <h2 className="text-xl font-bold text-green-800 dark:text-green-200">
              {t("certification.alreadyVerified")}
            </h2>
            <p className="text-green-700 dark:text-green-300">
              {locale === "fr"
                ? "Votre identité a été vérifiée par notre équipe. Vous portez désormais le badge vérifié."
                : "Your identity has been verified by our team. You now carry the verified badge."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pending request */}
      {latestRequest?.status === "PENDING" && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <h2 className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                  {t("certification.pendingRequest")}
                </h2>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {t("certification.pendingDesc")}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-yellow-700 dark:text-yellow-300">
                {t("certification.submittedAt")}:{" "}
                {new Date(latestRequest.createdAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US")}
              </span>
              <Button variant="outline" size="sm" onClick={handleCancelRequest}>
                {t("certification.cancelRequest")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected - show reason */}
      {latestRequest?.status === "REJECTED" && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldX className="h-8 w-8 text-red-600" />
              <div>
                <h2 className="text-lg font-bold text-red-800 dark:text-red-200">
                  {t("certification.statusRejected")}
                </h2>
                {latestRequest.rejectionReason && (
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    <strong>{t("certification.rejectionReason")}:</strong>{" "}
                    {latestRequest.rejectionReason}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Eligibility check */}
      {eligibility && step === "eligibility" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {t("certification.eligibility")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {eligibility.eligible ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{t("certification.eligible")}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">{t("certification.notEligible")}</span>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t("certification.requirements")}
              </h3>

              {/* Active account */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {eligibility.active ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">{t("certification.activeAccount")}</span>
                </div>
                <Badge variant={eligibility.active ? "default" : "destructive"}>
                  {eligibility.active
                    ? locale === "fr"
                      ? "Oui"
                      : "Yes"
                    : locale === "fr"
                      ? "Non"
                      : "No"}
                </Badge>
              </div>

              {/* Completed returns */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {eligibility.completedReturns >= eligibility.minReturns ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">{t("certification.completedReturns")}</span>
                </div>
                <Badge
                  variant={
                    eligibility.completedReturns >= eligibility.minReturns
                      ? "default"
                      : "destructive"
                  }
                >
                  {eligibility.completedReturns} / {eligibility.minReturns}{" "}
                  {t("certification.minReturns")}
                </Badge>
              </div>

              {/* Trust score */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {eligibility.trustScore >= eligibility.minTrustScore ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">{t("certification.trustScoreReq")}</span>
                </div>
                <Badge
                  variant={
                    eligibility.trustScore >= eligibility.minTrustScore
                      ? "default"
                      : "destructive"
                  }
                >
                  {eligibility.trustScore} / {eligibility.minTrustScore}
                </Badge>
              </div>
            </div>

            {eligibility.eligible && !eligibility.hasPending && (
              <>
                <Separator />
                <Button
                  className="w-full"
                  onClick={() => setStep("submit")}
                >
                  {t("certification.requestCertification")}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}

            {eligibility.hasPending && (
              <div className="flex items-center gap-2 text-blue-600 text-sm">
                <Info className="h-4 w-4" />
                {locale === "fr"
                  ? "Vous avez déjà une demande en cours."
                  : "You already have a pending request."}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit form */}
      {step === "submit" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("certification.requestCertification")}
            </CardTitle>
            <CardDescription>
              {locale === "fr"
                ? "Joignez une copie de votre document d'identité"
                : "Attach a copy of your identity document"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("certification.documentType")}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "CNI", label: t("certification.cni") },
                  { value: "PASSPORT", label: t("certification.passport") },
                  { value: "PERMIS", label: t("certification.permis") },
                  { value: "OTHER", label: t("certification.other") },
                ].map((doc) => (
                  <Button
                    key={doc.value}
                    variant={documentType === doc.value ? "default" : "outline"}
                    className="justify-start text-xs h-auto py-3"
                    onClick={() => setDocumentType(doc.value)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {doc.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Document upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("certification.uploadDocument")}</label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
                  ${docDragging ? "border-primary bg-primary/5" : "hover:border-primary/50"}
                  ${uploadingDoc ? "opacity-50 pointer-events-none" : ""}
                `}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDocDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDocDragging(false); }}
                onDrop={handleDocDrop}
                onClick={() => !documentUrl && !uploadingDoc && docInputRef.current?.click()}
              >
                {documentUrl ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
                    <p className="text-sm text-green-600 font-medium">
                      {locale === "fr" ? "Document téléchargé ✓" : "Document uploaded ✓"}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setDocumentUrl("")}>
                      {locale === "fr" ? "Remplacer" : "Replace"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      {docDragging
                        ? (locale === "fr" ? "Déposez votre document ici" : "Drop your document here")
                        : t("certification.uploadHint")
                      }
                    </p>
                    {uploadingDoc && (
                      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    )}
                  </div>
                )}
              </div>
              <input
                ref={docInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleUploadDocument}
              />
            </div>

            {/* Selfie upload (optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("certification.uploadSelfie")}</label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
                  ${selfieDragging ? "border-primary bg-primary/5" : "hover:border-primary/50"}
                  ${uploadingSelfie ? "opacity-50 pointer-events-none" : ""}
                `}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setSelfieDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setSelfieDragging(false); }}
                onDrop={handleSelfieDrop}
                onClick={() => !selfieUrl && !uploadingSelfie && selfieInputRef.current?.click()}
              >
                {selfieUrl ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto" />
                    <p className="text-sm text-green-600 font-medium">
                      {locale === "fr" ? "Selfie téléchargé ✓" : "Selfie uploaded ✓"}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setSelfieUrl("")}>
                      {locale === "fr" ? "Retirer" : "Remove"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="h-6 w-6 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground">
                      {selfieDragging
                        ? (locale === "fr" ? "Déposez votre selfie ici" : "Drop your selfie here")
                        : (locale === "fr"
                          ? "Prenez un selfie en tenant votre document"
                          : "Take a selfie holding your document")
                      }
                    </p>
                    {uploadingSelfie && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                    )}
                  </div>
                )}
              </div>
              <input
                ref={selfieInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleUploadSelfie}
              />
            </div>

            <Separator />

            {/* Submit */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("eligibility")}>
                {t("common.back")}
              </Button>
              <Button
                className="flex-1"
                disabled={!documentType || !documentUrl || submitting}
                onClick={handleSubmitRequest}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                {t("certification.submitRequest")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success message */}
      {success && latestRequest?.status === "PENDING" && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <h2 className="text-lg font-bold text-green-800 dark:text-green-200">
              {t("certification.submitSuccess")}
            </h2>
            <p className="text-sm text-green-700 dark:text-green-300">
              {t("certification.submitSuccessDesc")}
            </p>
            <Button variant="outline" onClick={() => { setSuccess(false); fetchData(); }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {locale === "fr" ? "Vérifier le statut" : "Check status"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Request history */}
      {myRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("certification.myRequests")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {req.documentType} —{" "}
                    {new Date(req.createdAt).toLocaleDateString(
                      locale === "fr" ? "fr-FR" : "en-US"
                    )}
                  </p>
                  {req.rejectionReason && (
                    <p className="text-xs text-red-600">{req.rejectionReason}</p>
                  )}
                </div>
                <Badge
                  variant={
                    req.status === "APPROVED"
                      ? "default"
                      : req.status === "REJECTED"
                        ? "destructive"
                        : req.status === "PENDING"
                          ? "secondary"
                          : "outline"
                  }
                >
                  {req.status === "PENDING" && t("certification.statusPending")}
                  {req.status === "APPROVED" && t("certification.statusApproved")}
                  {req.status === "REJECTED" && t("certification.statusRejected")}
                  {req.status === "CANCELLED" && t("certification.statusCancelled")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CertificationPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <CertificationContent />
      </MainLayout>
    </AuthGuard>
  );
}
