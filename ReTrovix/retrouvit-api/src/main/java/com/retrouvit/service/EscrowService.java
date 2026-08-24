package com.retrouvit.service;

import com.retrouvit.dto.EscrowResponse;
import com.retrouvit.dto.FoundObjectResponse;
import com.retrouvit.dto.LostObjectResponse;
import com.retrouvit.dto.UserResponse;
import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.EscrowRepository;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EscrowService {

    private final EscrowRepository escrowRepository;
    private final UserRepository userRepository;

    public List<EscrowResponse> getEscrowsByUserId(Long userId) {
        return escrowRepository.findByBuyerIdOrSellerIdOrderByCreatedAtDesc(userId, userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public EscrowResponse createEscrow(Long buyerId, Long sellerId, Long amount, String location) {
        User buyer = userRepository.findById(buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("Acheteur non trouvé"));
        User seller = userRepository.findById(sellerId)
                .orElseThrow(() -> new ResourceNotFoundException("Retrouveur non trouvé"));

        Escrow escrow = Escrow.builder()
                .reference("ESC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .buyer(buyer)
                .seller(seller)
                .amount(amount)
                .deadline(LocalDate.now().plusDays(30))
                .location(location)
                .build();

        Escrow saved = escrowRepository.save(escrow);
        return toResponse(saved);
    }

    @Transactional
    public EscrowResponse confirmReturn(Long escrowId, Long userId) {
        Escrow escrow = escrowRepository.findById(escrowId)
                .orElseThrow(() -> new ResourceNotFoundException("Escrow non trouvé"));

        escrow.setStatus(EscrowStatus.RETURN_CONFIRMED);
        escrow.setProgress(60);
        Escrow saved = escrowRepository.save(escrow);
        return toResponse(saved);
    }

    @Transactional
    public EscrowResponse completeEscrow(Long escrowId, Long userId) {
        Escrow escrow = escrowRepository.findById(escrowId)
                .orElseThrow(() -> new ResourceNotFoundException("Escrow non trouvé"));

        escrow.setStatus(EscrowStatus.COMPLETED);
        escrow.setProgress(100);
        escrow.setCompletedAt(LocalDateTime.now());

        // Credit seller's wallet
        User seller = escrow.getSeller();
        seller.setWalletBalance(seller.getWalletBalance() + escrow.getAmount());
        userRepository.save(seller);

        Escrow saved = escrowRepository.save(escrow);
        return toResponse(saved);
    }

    @Transactional
    public EscrowResponse refundEscrow(Long escrowId, Long userId) {
        Escrow escrow = escrowRepository.findById(escrowId)
                .orElseThrow(() -> new ResourceNotFoundException("Escrow non trouvé"));

        escrow.setStatus(EscrowStatus.REFUNDED);
        escrow.setProgress(0);
        escrow.setCompletedAt(LocalDateTime.now());

        // Credit buyer's wallet
        User buyer = escrow.getBuyer();
        buyer.setWalletBalance(buyer.getWalletBalance() + escrow.getAmount());
        userRepository.save(buyer);

        Escrow saved = escrowRepository.save(escrow);
        return toResponse(saved);
    }

    private EscrowResponse toResponse(Escrow escrow) {
        long daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), escrow.getDeadline());
        if (daysLeft < 0) daysLeft = 0;

        return EscrowResponse.builder()
                .id(escrow.getId())
                .reference(escrow.getReference())
                .buyer(toUserResponse(escrow.getBuyer()))
                .seller(toUserResponse(escrow.getSeller()))
                .amount(escrow.getAmount())
                .status(escrow.getStatus().name())
                .deadline(escrow.getDeadline())
                .daysLeft((int) daysLeft)
                .progress(escrow.getProgress())
                .location(escrow.getLocation())
                .completedAt(escrow.getCompletedAt())
                .createdAt(escrow.getCreatedAt())
                .build();
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .trustScore(user.getTrustScore())
                .verified(user.getVerified())
                .build();
    }
}
