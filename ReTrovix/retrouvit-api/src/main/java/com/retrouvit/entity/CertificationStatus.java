package com.retrouvit.entity;

public enum CertificationStatus {
    PENDING,      // Demande en attente de review admin
    APPROVED,     // Approuvé → badge vérifié activé
    REJECTED,     // Refusé → raison fournie
    CANCELLED     // Annulé par l'utilisateur
}
