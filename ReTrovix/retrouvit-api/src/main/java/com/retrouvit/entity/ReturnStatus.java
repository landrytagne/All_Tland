package com.retrouvit.entity;

/**
 * Machine d'états officielle de la collaboration — RetrouvIt-Flow-Restitution.md §25.
 *
 * Flux nominal :
 * MATCH_FOUND → VERIFICATION_PENDING → VERIFIED → CONNECTION_PENDING →
 * CHAT_ACTIVE → PROPOSAL_PENDING → PAYMENT_PENDING → ESCROW_FUNDED →
 * MISSION_READY → MISSION_STARTED → MEETING_IN_PROGRESS → HANDOVER_PENDING → COMPLETED
 *
 * Sorties parallèles :
 * CONNECTION_PENDING → REJECTED
 * PROPOSAL_PENDING   → REJECTED (retour discussion) / contre-proposition
 * PAYMENT_PENDING    → PAYMENT_FAILED
 * Presque toute étape → DISPUTED → UNDER_REVIEW → RESOLVED (→ REFUNDED ou COMPLETED)
 */
public enum ReturnStatus {
    // ─── Flux nominal ────────────────────────────────────────
    MATCH_FOUND,            // Correspondance détectée par le moteur (≥ 80 %)
    VERIFICATION_PENDING,   // Question de vérification posée au Chercheur (§2)
    VERIFIED,               // Propriété confirmée (question secrète ou preuves)
    CONNECTION_PENDING,     // Demande de restitution envoyée, Finder doit répondre (§3-4)
    CHAT_ACTIVE,            // Mise en relation acceptée, messagerie disponible (§5)
    PROPOSAL_PENDING,       // Proposition (montant + date + lieu) en attente de réponse (§6-8)
    PAYMENT_PENDING,        // Proposition acceptée, Chercheur doit payer (§9)
    ESCROW_FUNDED,          // Paiement sécurisé en séquestre (§10)
    MISSION_READY,          // Restitution prête — « Commencer la mission » (§11)
    MISSION_STARTED,        // Mission démarrée, partage de position actif (§12-13)
    MEETING_IN_PROGRESS,    // Finder arrivé au rendez-vous (§14)
    HANDOVER_PENDING,       // Une confirmation de remise reçue, l'autre attendue (§16-18)
    COMPLETED,              // Restitution confirmée, fonds libérés automatiquement (§19-20)

    // ─── Sorties parallèles ──────────────────────────────────
    REJECTED,               // Restitution refusée par le Finder (§4)
    PAYMENT_FAILED,         // Échec du paiement (§25)
    DISPUTED,               // Litige signalé (§22-23)
    UNDER_REVIEW,           // Litige en cours d'arbitrage back-office (§24)
    RESOLVED,               // Litige tranché (refund ou release selon décision §23)
    REFUNDED,               // Fonds remboursés au Chercheur (litige gagné §23)
    CANCELLED               // Annulé par l'une des parties
}
