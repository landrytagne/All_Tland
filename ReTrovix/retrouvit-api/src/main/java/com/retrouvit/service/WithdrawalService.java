package com.retrouvit.service;

import com.retrouvit.dto.WithdrawalResponse;
import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.AdminAlertRepository;
import com.retrouvit.repository.UserRepository;
import com.retrouvit.repository.WithdrawalRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Retraits du wallet vers Mobile Money — CDC §5.4 / §8.2 :
 * - le solde est débité dès la demande (bloque les doubles dépenses) ;
 * - tout retrait ≥ seuil withdraw_manual_review_min (paramétrable) exige
 *   une validation manuelle finance (anti-fraude) ;
 * - échec provider ou rejet finance → recrédit immédiat du solde ;
 * - alerte admin pour toute demande au-dessus du seuil.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WithdrawalService {

    static final String SETTING_MANUAL_REVIEW_MIN = "withdraw_manual_review_min";

    private final WithdrawalRequestRepository withdrawalRepository;
    private final UserRepository userRepository;
    private final TransactionService transactionService;
    private final PlatformSettingsService platformSettingsService;
    private final PaymentGatewayService paymentGateway;
    private final AdminAlertRepository adminAlertRepository;

    /**
     * Demande de retrait : débite le solde, crée la demande et soit
     * soumet immédiatement au provider (sous le seuil), soit la place
     * en attente de validation finance (au-dessus du seuil).
     */
    @Transactional
    public WithdrawalResponse requestWithdrawal(Long userId, String method, String phoneNumber, Long amount) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Le montant doit être positif");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        if (user.getWalletBalance() < amount) {
            throw new IllegalArgumentException("Solde insuffisant");
        }

        // Débit immédiat — recrédité si échec/refus
        user.setWalletBalance(user.getWalletBalance() - amount);
        userRepository.save(user);

        WithdrawalRequest withdrawal = WithdrawalRequest.builder()
                .user(user)
                .reference("WD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .amount(amount)
                .method(method)
                .phoneNumber(phoneNumber)
                .build();

        long threshold = manualReviewThreshold();
        if (amount >= threshold) {
            // Anti-fraude : validation manuelle finance (CDC §8.2)
            withdrawal.setStatus(WithdrawalStatus.PENDING_REVIEW);
            withdrawal = withdrawalRepository.save(withdrawal);
            createFraudAlert(user, withdrawal, threshold);
            log.info("Retrait {} ({}) en attente de validation finance (seuil {})",
                    withdrawal.getReference(), amount, threshold);
        } else {
            withdrawal.setStatus(WithdrawalStatus.PROCESSING);
            withdrawal = withdrawalRepository.save(withdrawal);
            submitToProvider(withdrawal);
        }

        return toResponse(withdrawal);
    }

    /** Soumet la demande au provider et enregistre la référence externe. */
    private void submitToProvider(WithdrawalRequest withdrawal) {
        String providerRef = paymentGateway.submitWithdrawal(
                withdrawal.getReference(), withdrawal.getMethod(),
                withdrawal.getPhoneNumber(), withdrawal.getAmount());

        boolean confirmed = paymentGateway.isWithdrawalConfirmed(providerRef);
        if (confirmed) {
            withdrawal.setStatus(WithdrawalStatus.COMPLETED);
            transactionService.createTransaction(withdrawal.getUser().getId(),
                    TransactionType.WITHDRAWAL, withdrawal.getAmount(),
                    "Retrait " + withdrawal.getReference() + " via " + withdrawal.getMethod());
        } else {
            failWithdrawal(withdrawal, "Transaction refusée par le fournisseur de paiement");
        }
    }

    /**
     * Validation manuelle par un admin finance (CDC §8.2).
     * approve=true → soumission au provider ; approve=false → rejet + recrédit.
     */
    @Transactional
    public WithdrawalResponse reviewWithdrawal(Long withdrawalId, Long adminId, boolean approve, String note) {
        WithdrawalRequest withdrawal = withdrawalRepository.findById(withdrawalId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de retrait non trouvée"));

        if (withdrawal.getStatus() != WithdrawalStatus.PENDING_REVIEW) {
            throw new IllegalArgumentException("Cette demande n'est plus en attente de validation");
        }

        withdrawal.setReviewedBy(adminId);
        withdrawal.setReviewedAt(LocalDateTime.now());

        if (approve) {
            withdrawal.setStatus(WithdrawalStatus.PROCESSING);
            withdrawalRepository.save(withdrawal);
            submitToProvider(withdrawal);
        } else {
            withdrawal.setStatus(WithdrawalStatus.REJECTED);
            withdrawal.setFailureReason(note != null ? note : "Rejeté par la finance");
            withdrawalRepository.save(withdrawal);
            refundUser(withdrawal, "Retrait " + withdrawal.getReference() + " rejeté — remboursement");
        }
        return toResponse(withdrawal);
    }

    /** File de validation finance (back-office — CDC §8.2). */
    @Transactional(readOnly = true)
    public List<WithdrawalResponse> getPendingReviewWithdrawals() {
        return withdrawalRepository.findByStatusOrderByCreatedAtAsc(WithdrawalStatus.PENDING_REVIEW).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /** Historique des retraits de l'utilisateur (CDC §5.4). */
    @Transactional(readOnly = true)
    public List<WithdrawalResponse> getUserWithdrawals(Long userId) {
        return withdrawalRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /** Recrédite le solde et trace la transaction de remboursement. */
    private void refundUser(WithdrawalRequest withdrawal, String description) {
        User user = withdrawal.getUser();
        user.setWalletBalance(user.getWalletBalance() + withdrawal.getAmount());
        userRepository.save(user);
        transactionService.createTransaction(user.getId(),
                TransactionType.REFUND, withdrawal.getAmount(), description);
    }

    private void failWithdrawal(WithdrawalRequest withdrawal, String reason) {
        withdrawal.setStatus(WithdrawalStatus.FAILED);
        withdrawal.setFailureReason(reason);
        withdrawalRepository.save(withdrawal);
        refundUser(withdrawal, "Retrait " + withdrawal.getReference() + " échoué — remboursement");
    }

    private long manualReviewThreshold() {
        try {
            long v = platformSettingsService.getSettingAsInt(SETTING_MANUAL_REVIEW_MIN);
            return v > 0 ? v : 100_000; // défaut CDC : 100 000 XAF
        } catch (Exception e) {
            return 100_000;
        }
    }

    private void createFraudAlert(User user, WithdrawalRequest withdrawal, long threshold) {
        try {
            adminAlertRepository.save(AdminAlert.builder()
                    .level(AlertLevel.WARNING)
                    .category("FINANCE")
                    .title("Retrait à valider — " + withdrawal.getReference())
                    .message(String.format("Retrait de %d XAF par %s (≥ seuil anti-fraude %d XAF) — validation finance requise.",
                            withdrawal.getAmount(), user.getEmail(), threshold))
                    .currentValue(withdrawal.getAmount())
                    .thresholdValue(threshold)
                    .build());
        } catch (Exception e) {
            log.error("Impossible de créer l'alerte anti-fraude: {}", e.getMessage());
        }
    }

    private WithdrawalResponse toResponse(WithdrawalRequest w) {
        return WithdrawalResponse.builder()
                .id(w.getId())
                .reference(w.getReference())
                .amount(w.getAmount())
                .method(w.getMethod())
                .phoneNumber(w.getPhoneNumber())
                .status(w.getStatus().name())
                .failureReason(w.getFailureReason())
                .createdAt(w.getCreatedAt())
                .reviewedAt(w.getReviewedAt())
                .build();
    }
}
