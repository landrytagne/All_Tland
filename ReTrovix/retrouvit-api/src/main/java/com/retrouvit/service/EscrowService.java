package com.retrouvit.service;

import com.retrouvit.dto.EscrowResponse;
import com.retrouvit.dto.UserResponse;
import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.EscrowRepository;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class EscrowService {

    private final EscrowRepository escrowRepository;
    private final UserRepository userRepository;

    public List<EscrowResponse> getEscrowsByUserId(Long userId) {
        return escrowRepository.findByBuyerIdOrSellerIdOrderByCreatedAtDesc(userId, userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Créer un escrow (appelé par ReturnRequestService.acceptReward)
     */
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

    /**
     * Verrouiller l'escrow (collaboration active)
     * Idempotent: ne fait rien si déjà verrouillé
     */
    @Transactional
    public EscrowResponse lockEscrow(Long escrowId, Long userId) {
        Escrow escrow = escrowRepository.findById(escrowId)
                .orElseThrow(() -> new ResourceNotFoundException("Escrow non trouvé"));

        // Idempotence: déjà verrouillé
        if (escrow.getStatus() == EscrowStatus.LOCKED) {
            log.info("Escrow {} already locked, skipping", escrowId);
            return toResponse(escrow);
        }

        // Vérifier que l'escrow est dans un état permettant le verrouillage
        if (escrow.getStatus() != EscrowStatus.AWAITING_RETURN) {
            throw new IllegalArgumentException(
                    "L'escrow ne peut être verrouillé qu'en attente de retour (état actuel: " + escrow.getStatus() + ")");
        }

        escrow.setStatus(EscrowStatus.LOCKED);
        escrow.setProgress(20);
        Escrow saved = escrowRepository.save(escrow);

        log.info("Escrow {} locked", escrowId);
        return toResponse(saved);
    }

    /**
     * Confirmer le retour (l'objet a été remis)
     * Idempotent: ne fait rien si déjà confirmé
     */
    @Transactional
    public EscrowResponse confirmReturn(Long escrowId, Long userId) {
        Escrow escrow = escrowRepository.findById(escrowId)
                .orElseThrow(() -> new ResourceNotFoundException("Escrow non trouvé"));

        // Idempotence
        if (escrow.getStatus() == EscrowStatus.RETURN_CONFIRMED
                || escrow.getStatus() == EscrowStatus.RELEASED
                || escrow.getStatus() == EscrowStatus.COMPLETED) {
            log.info("Escrow {} return already confirmed or beyond, skipping", escrowId);
            return toResponse(escrow);
        }

        if (escrow.getStatus() != EscrowStatus.LOCKED) {
            throw new IllegalArgumentException(
                    "Le retour ne peut être confirmé qu'en escrow verrouillé (état actuel: " + escrow.getStatus() + ")");
        }

        escrow.setStatus(EscrowStatus.RETURN_CONFIRMED);
        escrow.setProgress(80);
        Escrow saved = escrowRepository.save(escrow);

        log.info("Escrow {} return confirmed", escrowId);
        return toResponse(saved);
    }

    /**
     * Libérer l'escrow au trouveur
     * Protection contre double release: vérifie l'état avant de libérer
     * Idempotent: ne fait rien si déjà libéré
     */
    @Transactional
    public EscrowResponse releaseEscrow(Long escrowId, Long userId) {
        Escrow escrow = escrowRepository.findById(escrowId)
                .orElseThrow(() -> new ResourceNotFoundException("Escrow non trouvé"));

        // ═══ DOUBLE-RELEASE PROTECTION ═══
        if (escrow.getStatus() == EscrowStatus.RELEASED
                || escrow.getStatus() == EscrowStatus.COMPLETED) {
            log.warn("DOUBLE-RELEASE BLOCKED: Escrow {} already released/completed. State: {}",
                    escrowId, escrow.getStatus());
            throw new IllegalStateException(
                    "Ce paiement a déjà été libéré. Opération bloquée par sécurité.");
        }

        // ═══ DISPUTE PROTECTION ═══
        if (escrow.getStatus() == EscrowStatus.DISPUTED) {
            log.warn("RELEASE BLOCKED DURING DISPUTE: Escrow {} is disputed", escrowId);
            throw new IllegalStateException(
                    "Impossible de libérer un escrow en litige. Résolvez le litige d'abord.");
        }

        // Vérifier que le retour est confirmé
        if (escrow.getStatus() != EscrowStatus.RETURN_CONFIRMED
                && escrow.getStatus() != EscrowStatus.RELEASE_PENDING) {
            throw new IllegalArgumentException(
                    "Le retour doit être confirmé avant la libération (état actuel: " + escrow.getStatus() + ")");
        }

        escrow.setStatus(EscrowStatus.RELEASED);
        escrow.setProgress(100);
        escrow.setCompletedAt(LocalDateTime.now());

        // Créditer le wallet du trouveur (atomique, audit M4)
        User seller = escrow.getSeller();
        userRepository.creditWalletAtomically(seller.getId(), escrow.getAmount());

        Escrow saved = escrowRepository.save(escrow);

        log.info("Escrow {} released: {} XAF credited to seller {}",
                escrowId, escrow.getAmount(), seller.getId());
        return toResponse(saved);
    }

    /**
     * Rembourser l'escrow au propriétaire
     * Protection contre double refund
     */
    @Transactional
    public EscrowResponse refundEscrow(Long escrowId, Long userId) {
        Escrow escrow = escrowRepository.findById(escrowId)
                .orElseThrow(() -> new ResourceNotFoundException("Escrow non trouvé"));

        // ═══ DOUBLE-REFUND PROTECTION ═══
        if (escrow.getStatus() == EscrowStatus.REFUNDED
                || escrow.getStatus() == EscrowStatus.COMPLETED) {
            log.warn("DOUBLE-REFUND BLOCKED: Escrow {} already refunded/completed", escrowId);
            throw new IllegalStateException(
                    "Ce paiement a déjà été remboursé.");
        }

        // Ne pas rembourser un escrow déjà libéré au trouveur
        if (escrow.getStatus() == EscrowStatus.RELEASED) {
            throw new IllegalStateException(
                    "Impossible de rembourser un escrow déjà libéré au retrouveur.");
        }

        escrow.setStatus(EscrowStatus.REFUNDED);
        escrow.setProgress(0);
        escrow.setCompletedAt(LocalDateTime.now());

        // Créditer le wallet du propriétaire (atomique, audit M4)
        User buyer = escrow.getBuyer();
        userRepository.creditWalletAtomically(buyer.getId(), escrow.getAmount());

        Escrow saved = escrowRepository.save(escrow);

        log.info("Escrow {} refunded: {} XAF credited to buyer {}",
                escrowId, escrow.getAmount(), buyer.getId());
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
