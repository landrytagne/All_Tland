package com.retrouvit.service;

import com.retrouvit.dto.PaymentRequest;
import com.retrouvit.dto.PaymentResponse;
import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.PaymentRepository;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final TransactionService transactionService;

    /**
     * Initier un paiement Mobile Money
     */
    @Transactional
    public PaymentResponse initiatePayment(Long userId, PaymentRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        PaymentProvider provider = PaymentProvider.valueOf(request.getProvider());
        PaymentMethod method = PaymentMethod.valueOf(request.getMethod());

        Payment payment = Payment.builder()
                .reference(generateReference())
                .user(user)
                .provider(provider)
                .method(method)
                .amount(request.getAmount())
                .currency("XAF")
                .phoneNumber(request.getPhoneNumber())
                .status(PaymentStatus.PENDING)
                .build();

        Payment saved = paymentRepository.save(payment);
        log.info("Payment initiated: {} for user {} - {} XAF via {}", saved.getReference(), userId, request.getAmount(), provider);

        // Simulate Mobile Money API call
        // In production, integrate with MTN MoMo API or Orange Money API
        return simulatePaymentProcessing(saved);
    }

    /**
     * Simuler le traitement du paiement Mobile Money
     * En production, remplacer par un vrai appel API au fournisseur
     */
    private PaymentResponse simulatePaymentProcessing(Payment payment) {
        // Simulate processing delay (in real app, this would be async via webhook/callback)
        payment.setStatus(PaymentStatus.PROCESSING);
        paymentRepository.save(payment);

        // Simulate 95% success rate
        boolean success = Math.random() < 0.95;

        if (success) {
            payment.setStatus(PaymentStatus.COMPLETED);
            payment.setExternalReference("EXT-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
            payment.setCompletedAt(LocalDateTime.now());
            paymentRepository.save(payment);

            // Credit user wallet (atomique, audit M4)
            User user = payment.getUser();
            userRepository.creditWalletAtomically(user.getId(), payment.getAmount());

            // Create corresponding transaction
            transactionService.createTransaction(
                    user.getId(),
                    TransactionType.DEPOSIT,
                    payment.getAmount(),
                    "Dépôt via " + payment.getProvider().name() + " (" + payment.getReference() + ")"
            );

            log.info("Payment completed: {} - {} XAF credited to user {}", payment.getReference(), payment.getAmount(), user.getId());
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason("Transaction refusée par le fournisseur de paiement");
            paymentRepository.save(payment);
            log.warn("Payment failed: {} - {}", payment.getReference(), payment.getFailureReason());
        }

        return toResponse(payment);
    }

    /**
     * Vérifier le statut d'un paiement
     */
    public PaymentResponse getPaymentStatus(Long userId, String reference) {
        Payment payment = paymentRepository.findByReference(reference)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement non trouvé"));

        if (!payment.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Ce paiement ne vous appartient pas");
        }

        return toResponse(payment);
    }

    /**
     * Obtenir l'historique des paiements d'un utilisateur
     */
    public List<PaymentResponse> getPaymentHistory(Long userId) {
        return paymentRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtenir les stats de paiement d'un utilisateur
     */
    public PaymentStats getPaymentStats(Long userId) {
        long totalPayments = paymentRepository.countByUserIdAndStatus(userId, PaymentStatus.COMPLETED);
        Long totalDeposited = paymentRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, PaymentStatus.COMPLETED)
                .stream()
                .mapToLong(Payment::getAmount)
                .sum();

        return PaymentStats.builder()
                .totalPayments(totalPayments)
                .totalDeposited(totalDeposited)
                .build();
    }

    private String generateReference() {
        return "PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private PaymentResponse toResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .reference(payment.getReference())
                .provider(payment.getProvider().name())
                .method(payment.getMethod().name())
                .status(payment.getStatus().name())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .phoneNumber(payment.getPhoneNumber())
                .externalReference(payment.getExternalReference())
                .failureReason(payment.getFailureReason())
                .completedAt(payment.getCompletedAt())
                .createdAt(payment.getCreatedAt())
                .build();
    }

    @lombok.Data
    @lombok.Builder
    public static class PaymentStats {
        private long totalPayments;
        private long totalDeposited;
    }
}
