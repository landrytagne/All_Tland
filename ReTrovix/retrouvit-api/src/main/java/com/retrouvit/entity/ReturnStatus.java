package com.retrouvit.entity;

public enum ReturnStatus {
    // ─── Phase 1: Match & Preuves ───────────────────────────
    MATCH_FOUND,            // Correspondance détectée par le moteur
    PROOF_SUBMITTED,        // Le trouveur a soumis ses preuves
    NEED_MORE_INFO,         // Le propriétaire demande plus d'informations

    // ─── Phase 2: Validation de propriété ────────────────────
    OWNER_CONFIRMED,        // Le propriétaire confirme que c'est son objet
    REJECTED,               // Le propriétaire rejette les preuves

    // ─── Phase 3: Négociation récompense ─────────────────────
    NEGOTIATING,            // Négociation en cours (via chat structuré)
    REWARD_ACCEPTED,        // Montant accepté par les deux parties

    // ─── Phase 4: Paiement ──────────────────────────────────
    PAYMENT_PENDING,        // En attente de paiement par le propriétaire
    PAYMENT_FAILED,         // Le paiement a échoué
    PAYMENT_LOCKED,         // Montant verrouillé en escrow

    // ─── Phase 5: Collaboration ─────────────────────────────
    COLLABORATION_ACTIVE,   // Messagerie ouverte, collaboration en cours

    // ─── Phase 6: Restitution ───────────────────────────────
    RETURN_IN_PROGRESS,     // Restitution en cours (rendez-vous, déplacement)
    RETURN_CONFIRMED,       // Les deux parties confirment la restitution

    // ─── Phase 7: Paiement final ────────────────────────────
    RELEASE_PENDING,        // En attente de libération de l'escrow
    RELEASED,               // Escrow libéré au trouveur
    COMPLETED,              // Transaction terminée

    // ─── Cas alternatifs ────────────────────────────────────
    DISPUTED,               // Litige ouvert
    DISPUTE_RESOLVED,       // Litige résolu
    SUPPORT_REVIEW,         // En revue par le support
    REFUNDED,               // Remboursé au propriétaire
    CANCELLED,              // Annulé par l'une des parties

    // ─── Backward compatibility (ancien workflow) ────────────
    CHAT_INITIATED,         // Ancien statut, conservé pour compatibilité
    PAYMENT_COMPLETED       // Ancien statut, conservé pour compatibilité
}
