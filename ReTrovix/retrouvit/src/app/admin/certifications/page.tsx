"use client";

import * as React from "react";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  FileText,
  Camera,
  AlertTriangle,
  BarChart3,
  Users,
  Award,
  Ban,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { certificationApi, type CertificationResponse } from "@/lib/api-core";

function AdminCertificationsContent() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [requests, setRequests] = React.useState<CertificationResponse[]>([]);
  const [stats, setStats] = React.useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = React.useState("pending");

  // Dialog state
  const [selectedRequest, setSelectedRequest] = React.useState<CertificationResponse | null>(null);
  const [actionType, setActionType] = React.useState<"approve" | "reject">("approve");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");
  const [adminNotes, setAdminNotes] = React.useState("");
  const [processing, setProcessing] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [allRequests, certificationStats] = await Promise.all([
        certificationApi.getAllRequests(),
        certificationApi.getStats(),
      ]);
      setRequests(allRequests);
      setStats(certificationStats);
    } catch (err) {
      console.error("Failed to load certifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      setProcessing(true);
      await certificationApi.approveRequest(selectedRequest.id, adminNotes || undefined);
      setDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes("");
      await fetchData();
    } catch (err: any) {
      console.error("Approve failed:", err);
      alert(err.message || "Erreur lors de l'approbation");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) return;
    try {
      setProcessing(true);
      await certificationApi.rejectRequest(
        selectedRequest.id,
        rejectReason,
        adminNotes || undefined
      );
      setDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason("");
      setAdminNotes("");
      await fetchData();
    } catch (err: any) {
      console.error("Reject failed:", err);
      alert(err.message || "Erreur lors du refus");
    } finally {
      setProcessing(false);
    }
  };

  const openApproveDialog = (req: CertificationResponse) => {
    setSelectedRequest(req);
    setActionType("approve");
    setAdminNotes("");
    setDialogOpen(true);
  };

  const openRejectDialog = (req: CertificationResponse) => {
    setSelectedRequest(req);
    setActionType("reject");
    setRejectReason("");
    setAdminNotes("");
    setDialogOpen(true);
  };

  const filteredRequests = requests.filter((req) => {
    if (activeTab === "pending") return req.status === "PENDING";
    if (activeTab === "approved") return req.status === "APPROVED";
    if (activeTab === "rejected") return req.status === "REJECTED";
    return true;
  });

  const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
    PENDING: {
      label: t("certification.statusPending"),
      variant: "secondary",
      icon: Clock,
    },
    APPROVED: {
      label: t("certification.statusApproved"),
      variant: "default",
      icon: CheckCircle2,
    },
    REJECTED: {
      label: t("certification.statusRejected"),
      variant: "destructive",
      icon: XCircle,
    },
    CANCELLED: {
      label: t("certification.statusCancelled"),
      variant: "outline",
      icon: Ban,
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("certification.adminTitle")}</h1>
          <p className="text-muted-foreground">
            {locale === "fr"
              ? "Examinez et approuvez les demandes de certification"
              : "Review and approve certification requests"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.pending || 0}</p>
            <p className="text-xs text-muted-foreground">{t("certification.pendingRequests")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.approved || 0}</p>
            <p className="text-xs text-muted-foreground">{t("certification.approved")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.rejected || 0}</p>
            <p className="text-xs text-muted-foreground">{t("certification.rejected")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.approvalRate || 0}%</p>
            <p className="text-xs text-muted-foreground">{t("certification.approvalRate")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            {t("certification.pendingRequests")} ({stats.pending || 0})
          </TabsTrigger>
          <TabsTrigger value="approved">{t("certification.approved")}</TabsTrigger>
          <TabsTrigger value="rejected">{t("certification.rejected")}</TabsTrigger>
          <TabsTrigger value="all">{t("certification.allRequests")}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {locale === "fr"
                  ? "Aucune demande dans cette catégorie"
                  : "No requests in this category"}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => {
                const statusInfo = statusConfig[req.status] || statusConfig.PENDING;
                const StatusIcon = statusInfo.icon;
                return (
                  <Card key={req.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{req.userName}</h3>
                            <Badge variant={statusInfo.variant}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {req.documentType}
                            </span>
                            <span>
                              {t("certification.submittedAt")}:{" "}
                              {new Date(req.createdAt).toLocaleDateString(
                                locale === "fr" ? "fr-FR" : "en-US"
                              )}
                            </span>
                          </div>

                          <div className="flex gap-3 text-sm">
                            <span className="flex items-center gap-1">
                              <Award className="h-3 w-3 text-blue-600" />
                              {t("certification.userStats")}
                              {req.returnCountAtSubmission}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-600" />
                              {t("certification.trustScore")}
                              {req.trustScoreAtSubmission}
                            </span>
                          </div>

                          {req.rejectionReason && (
                            <p className="text-sm text-red-600">
                              <strong>{t("certification.rejectionReason")}:</strong>{" "}
                              {req.rejectionReason}
                            </p>
                          )}

                          {req.adminNotes && (
                            <p className="text-sm text-muted-foreground italic">
                              <strong>{t("certification.adminNotes")}:</strong> {req.adminNotes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          {/* View document */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(req.documentUrl, "_blank")}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            {locale === "fr" ? "Voir doc" : "View doc"}
                          </Button>

                          {req.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => openApproveDialog(req)}
                              >
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                {t("certification.approve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openRejectDialog(req)}
                              >
                                <ShieldX className="mr-1 h-3 w-3" />
                                {t("certification.reject")}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  {t("certification.approve")}
                </>
              ) : (
                <>
                  <ShieldX className="h-5 w-5 text-red-600" />
                  {t("certification.reject")}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.userName} — {selectedRequest?.documentType}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === "reject" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-red-600">
                  {t("certification.rejectionReason")} *
                </label>
                <Textarea
                  placeholder={t("certification.rejectionReasonPlaceholder")}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("certification.adminNotes")}</label>
              <Textarea
                placeholder={t("certification.adminNotesPlaceholder")}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            {actionType === "approve" ? (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
                disabled={processing}
              >
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("certification.approve")}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
              >
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("certification.reject")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function AdminCertificationsPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <AdminCertificationsContent />
      </MainLayout>
    </AuthGuard>
  );
}
