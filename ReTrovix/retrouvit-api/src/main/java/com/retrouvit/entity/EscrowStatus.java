package com.retrouvit.entity;

public enum EscrowStatus {
    AWAITING_RETURN,    // Montant en attente (débité du wallet owner)
    LOCKED,             // Montant verrouillé (collaboration active)
    RETURN_CONFIRMED,   // Retour confirmé, en attente de release
    RELEASE_PENDING,    // Release en cours de traitement
    RELEASED,           // Montant libéré au trouveur
    COMPLETED,          // Transaction escrow terminée
    REFUNDED,           // Montant remboursé au propriétaire
    DISPUTED            // Litige en cours, fonds gelés
}
