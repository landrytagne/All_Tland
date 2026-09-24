import { apiRequest } from "./api-core";

// ─── Proof API ────────────────────────────────────────────────

export interface ProofSubmitRequest {
  description: string;
  characteristics: string;
  condition: string;
  discoveryLocation: string;
  discoveryDateTime?: string;
  serialNumber?: string;
  technicalInfo?: string;
  photos?: string;
}

export interface ProofResponse {
  id: number;
  returnRequestId: number;
  submittedById: number;
  description: string;
  characteristics: string;
  condition: string;
  discoveryLocation: string;
  discoveryDateTime?: string;
  serialNumber?: string;
  technicalInfo?: string;
  photos?: string;
  status: string;
  reviewNote?: string;
  additionalInfoRequests: number;
  createdAt: string;
  updatedAt: string;
}

export const proofsApi = {
  /** Soumettre des preuves */
  submit: (returnId: number, data: ProofSubmitRequest) =>
    apiRequest<ProofResponse>(`/api/returns/${returnId}/proofs`, {
      method: "POST",
      body: data,
    }),

  /** Récupérer les preuves d'une demande */
  getByReturnId: (returnId: number) =>
    apiRequest<ProofResponse[]>(`/api/returns/${returnId}/proofs`),

  /** Demander plus d'informations */
  requestMoreInfo: (returnId: number, note: string) =>
    apiRequest<ProofResponse>(`/api/returns/${returnId}/proofs/request-more-info`, {
      method: "POST",
      body: { note },
    }),

  /** Confirmer la propriété */
  confirmOwnership: (returnId: number) =>
    apiRequest<any>(`/api/returns/${returnId}/proofs/confirm-ownership`, {
      method: "POST",
    }),

  /** Rejeter les preuves */
  reject: (returnId: number, reason: string) =>
    apiRequest<any>(`/api/returns/${returnId}/proofs/reject`, {
      method: "POST",
      body: { reason },
    }),
};

// ─── Negotiation API ──────────────────────────────────────────

export interface NegotiationOfferResponse {
  id: number;
  returnRequestId: number;
  offeredById: number;
  amount: number;
  status: string;
  parentOfferId?: number;
  message?: string;
  createdAt: string;
}

export const negotiationApi = {
  /** Proposer un montant */
  propose: (returnId: number, amount: number, message?: string) =>
    apiRequest<NegotiationOfferResponse>(`/api/returns/${returnId}/negotiate/propose`, {
      method: "POST",
      body: { amount, message },
    }),

  /** Contre-proposer */
  counter: (returnId: number, amount: number, message?: string) =>
    apiRequest<NegotiationOfferResponse>(`/api/returns/${returnId}/negotiate/counter`, {
      method: "POST",
      body: { amount, message },
    }),

  /** Accepter l'offre */
  accept: (returnId: number) =>
    apiRequest<any>(`/api/returns/${returnId}/negotiate/accept`, {
      method: "POST",
    }),

  /** Refuser l'offre */
  reject: (returnId: number) =>
    apiRequest<any>(`/api/returns/${returnId}/negotiate/reject`, {
      method: "POST",
    }),

  /** Historique des offres */
  getHistory: (returnId: number) =>
    apiRequest<NegotiationOfferResponse[]>(`/api/returns/${returnId}/negotiate`),
};
