package com.retrouvit.entity;

/**
 * Cycle de vie d'une demande de retrait — CDC §5.4 / §8.2 :
 * - PENDING_REVIEW : montant ≥ seuil anti-fraude → validation manuelle finance ;
 * - PROCESSING : transfert en cours vers le provider ;
 * - COMPLETED : fonds transférés ;
 * - FAILED : échec provider (fonds recrédités) ;
 * - REJECTED : refusé par la finance (fonds recrédités).
 */
public enum WithdrawalStatus {
    PENDING_REVIEW,
    PROCESSING,
    COMPLETED,
    FAILED,
    REJECTED
}
