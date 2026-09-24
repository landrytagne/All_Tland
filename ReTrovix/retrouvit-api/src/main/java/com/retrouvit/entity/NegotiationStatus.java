package com.retrouvit.entity;

public enum NegotiationStatus {
    PROPOSED,    // Une partie a proposé un montant
    COUNTERED,   // L'autre partie a fait une contre-proposition
    ACCEPTED,    // Les deux parties ont accepté le montant
    REJECTED     // Une partie a refusé
}
