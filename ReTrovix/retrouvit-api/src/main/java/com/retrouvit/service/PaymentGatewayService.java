package com.retrouvit.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Gateway de paiement — CDC §5.4/§8.
 * Interface unique côté métier ; l'implémentation actuelle simule le
 * provider (choix validé en session). Le branchement réel MTN MoMo /
 * Orange Money se fera en implémentant cette interface et en
 * remplaçant la simulation par l'appel API + webhook authentifié,
 * sans modifier le reste du code.
 */
public interface PaymentGatewayService {

    /**
     * Soumet un transfert sortant (retrait) au provider.
     *
     * @return référence provider à conserver pour la réconciliation
     */
    String submitWithdrawal(String reference, String method, String phoneNumber, Long amount);

    /**
     * Vérifie le statut d'un transfert auprès du provider (réconciliation).
     *
     * @return true si le transfert est confirmé COMPLETED côté provider
     */
    boolean isWithdrawalConfirmed(String providerReference);

    /** Vérifie la signature d'un webhook provider (HMAC en production). */
    boolean verifyWebhookSignature(String payload, String signature);
}
