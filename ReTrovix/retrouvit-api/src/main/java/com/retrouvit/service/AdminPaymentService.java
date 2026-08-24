package com.retrouvit.service;

import com.retrouvit.dto.PaymentResponse;
import com.retrouvit.entity.Payment;
import com.retrouvit.entity.PaymentProvider;
import com.retrouvit.entity.PaymentStatus;
import com.retrouvit.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminPaymentService {

    private final PaymentRepository paymentRepository;

    /**
     * Get all payments (admin view)
     */
    public List<PaymentResponse> getAllPayments() {
        return paymentRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get global payment stats (admin view)
     */
    public Map<String, Object> getGlobalStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalPayments", paymentRepository.countAll());
        stats.put("totalDeposited", paymentRepository.sumCompletedAmount());
        stats.put("pendingCount", paymentRepository.countPending());
        stats.put("pendingAmount", paymentRepository.sumPendingAmount());

        // Per-provider breakdown
        Map<String, Long> byProvider = new LinkedHashMap<>();
        for (PaymentProvider provider : PaymentProvider.values()) {
            long count = paymentRepository.findByProviderOrderByCreatedAtDesc(provider).size();
            byProvider.put(provider.name(), count);
        }
        stats.put("byProvider", byProvider);

        // Per-status breakdown
        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (PaymentStatus status : PaymentStatus.values()) {
            long count = paymentRepository.findByStatusOrderByCreatedAtDesc(status).size();
            byStatus.put(status.name(), count);
        }
        stats.put("byStatus", byStatus);

        return stats;
    }

    /**
     * Search payments by user name or reference
     */
    public List<PaymentResponse> searchPayments(String query) {
        return paymentRepository
                .findByUser_NameContainingIgnoreCaseOrReferenceContainingIgnoreCase(query, query)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
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
}
