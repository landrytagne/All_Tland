package com.retrouvit.entity;

public enum ProofStatus {
    SUBMITTED,       // Le trouveur a soumis les preuves
    NEED_MORE_INFO,  // Le propriétaire demande plus d'informations
    APPROVED,        // Le propriétaire confirme que c'est bien son objet
    REJECTED         // Le propriétaire rejette les preuves
}
