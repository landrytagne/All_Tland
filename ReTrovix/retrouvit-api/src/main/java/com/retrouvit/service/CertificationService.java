package com.retrouvit.service;

import com.retrouvit.dto.CertificationRequestDTO;
import com.retrouvit.dto.CertificationResponseDTO;
import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.CertificationRequestRepository;
import com.retrouvit.repository.ReturnRequestRepository;
import com.retrouvit.repository.UserRepository;

import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CertificationService {

    private final CertificationRequestRepository certificationRepository;
    private final UserRepository userRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final NotificationService notificationService;

    // Minimum requirements for certification
    private static final int MIN_COMPLETED_RETURNS = 1;
    private static final int MIN_TRUST_SCORE = 40;

    /**
     * Submit a certification request.
     * Checks eligibility: user must be active (not banned), have ≥1 completed return, and trust score ≥ 40.
     */
    @Transactional
    public CertificationResponseDTO submitRequest(Long userId, CertificationRequestDTO request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        // Check if user is banned
        if (Boolean.TRUE.equals(user.getBanned())) {
            throw new IllegalStateException("Votre compte est suspendu. Vous ne pouvez pas demander de certification.");
        }

        // Check if already verified
        if (Boolean.TRUE.equals(user.getVerified())) {
            throw new IllegalStateException("Vous êtes déjà certifié ✓");
        }

        // Check for pending request
        if (certificationRepository.existsByUserIdAndStatus(userId, CertificationStatus.PENDING)) {
            throw new IllegalStateException("Vous avez déjà une demande de certification en cours.");
        }

        // Count completed returns
        long completedReturns = returnRequestRepository.findByLoserIdOrFinderIdOrderByCreatedAtDesc(userId, userId)
                .stream()
                .filter(rr -> rr.getStatus() == ReturnStatus.PAYMENT_COMPLETED)
                .filter(rr -> Boolean.TRUE.equals(rr.getLoserReturnConfirmed()) && Boolean.TRUE.equals(rr.getFinderReturnConfirmed()))
                .count();

        // Check minimum requirements
        if (completedReturns < MIN_COMPLETED_RETURNS && user.getTrustScore() < MIN_TRUST_SCORE) {
            throw new IllegalStateException(
                    String.format("Vous devez avoir au moins %d restitution(s) complétée(s) OU un score de confiance ≥ %d pour demander la certification. Restitutions: %d, Score: %d",
                            MIN_COMPLETED_RETURNS, MIN_TRUST_SCORE, completedReturns, user.getTrustScore())
            );
        }

        CertificationRequest certRequest = CertificationRequest.builder()
                .user(user)
                .documentType(request.getDocumentType())
                .documentUrl(request.getDocumentUrl())
                .selfieUrl(request.getSelfieUrl())
                .activeStatus(!Boolean.TRUE.equals(user.getBanned()))
                .returnCountAtSubmission((int) completedReturns)
                .trustScoreAtSubmission(user.getTrustScore())
                .status(CertificationStatus.PENDING)
                .build();

        CertificationRequest saved = certificationRepository.save(certRequest);
        log.info("Certification request {} submitted by user {}", saved.getId(), userId);

        // Notify all admins about the new certification request
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        String notifTitle = "📋 Nouvelle demande de certification";
        String notifDesc = String.format(
                "%s a soumis une demande de certification (%s). Veuillez examiner la demande.",
                user.getName(),
                request.getDocumentType()
        );
        for (User admin : admins) {
            notificationService.createNotification(
                    admin.getId(),
                    NotificationType.SYSTEM,
                    notifTitle,
                    notifDesc
            );
        }

        return toResponse(saved);
    }

    /**
     * Get user's own certification requests.
     */
    public List<CertificationResponseDTO> getMyRequests(Long userId) {
        return certificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get user's latest request.
     */
    public CertificationResponseDTO getMyLatestRequest(Long userId) {
        return certificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .findFirst()
                .map(this::toResponse)
                .orElse(null);
    }

    /**
     * Get all pending certification requests (admin only).
     */
    public List<CertificationResponseDTO> getAllPendingRequests() {
        return certificationRepository.findByStatusOrderByCreatedAtDesc(CertificationStatus.PENDING)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all certification requests (admin only).
     */
    public List<CertificationResponseDTO> getAllRequests() {
        return certificationRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get certification requests by status (admin only).
     */
    public List<CertificationResponseDTO> getRequestsByStatus(CertificationStatus status) {
        return certificationRepository.findByStatusOrderByCreatedAtDesc(status)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Admin: Approve a certification request.
     */
    @Transactional
    public CertificationResponseDTO approveRequest(Long requestId, Long adminId, String adminNotes) {
        CertificationRequest request = certificationRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de certification non trouvée"));

        if (request.getStatus() != CertificationStatus.PENDING) {
            throw new IllegalStateException("Cette demande n'est pas en attente de review.");
        }

        User user = request.getUser();

        // Verify eligibility is still met
        if (Boolean.TRUE.equals(user.getBanned())) {
            throw new IllegalStateException("L'utilisateur est banni. Impossible de certifier.");
        }

        // Approve
        request.setStatus(CertificationStatus.APPROVED);
        request.setReviewedBy(adminId);
        request.setReviewedAt(LocalDateTime.now());
        request.setAdminNotes(adminNotes);
        certificationRepository.save(request);

        // Set user as verified
        user.setVerified(true);
        if (user.getTrustScore() < 80) {
            user.setTrustScore(Math.min(100, user.getTrustScore() + 20));
        }
        userRepository.save(user);

        // Notify user
        notificationService.createNotification(
                user.getId(),
                NotificationType.SYSTEM,
                "🎉 Certification approuvée !",
                "Félicitations ! Votre demande de certification a été approuvée. Vous portez désormais le badge vérifié ✓. Votre score de confiance a augmenté."
        );

        log.info("Certification request {} approved by admin {}", requestId, adminId);
        return toResponse(request);
    }

    /**
     * Admin: Reject a certification request.
     */
    @Transactional
    public CertificationResponseDTO rejectRequest(Long requestId, Long adminId, String rejectionReason, String adminNotes) {
        CertificationRequest request = certificationRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de certification non trouvée"));

        if (request.getStatus() != CertificationStatus.PENDING) {
            throw new IllegalStateException("Cette demande n'est pas en attente de review.");
        }

        if (rejectionReason == null || rejectionReason.isBlank()) {
            throw new IllegalStateException("La raison du refus est obligatoire.");
        }

        request.setStatus(CertificationStatus.REJECTED);
        request.setReviewedBy(adminId);
        request.setReviewedAt(LocalDateTime.now());
        request.setRejectionReason(rejectionReason);
        request.setAdminNotes(adminNotes);
        certificationRepository.save(request);

        // Notify user
        notificationService.createNotification(
                request.getUser().getId(),
                NotificationType.SYSTEM,
                "❌ Demande de certification refusée",
                "Votre demande de certification a été refusée. Raison : " + rejectionReason + ". Vous pouvez soumettre une nouvelle demande après corrections."
        );

        log.info("Certification request {} rejected by admin {}: {}", requestId, adminId, rejectionReason);
        return toResponse(request);
    }

    /**
     * Admin: Suspend a certification request.
     */
    @Transactional
    public CertificationResponseDTO suspendRequest(Long requestId, Long adminId, String reason, String adminNotes) {
        CertificationRequest request = certificationRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de certification non trouvée"));

        if (request.getStatus() != CertificationStatus.PENDING) {
            throw new IllegalStateException("Cette demande n'est pas en attente de review.");
        }

        request.setStatus(CertificationStatus.SUSPENDED);
        request.setReviewedBy(adminId);
        request.setReviewedAt(LocalDateTime.now());
        request.setRejectionReason(reason);
        request.setAdminNotes(adminNotes);
        certificationRepository.save(request);

        // Notify user
        notificationService.createNotification(
                request.getUser().getId(),
                NotificationType.SYSTEM,
                "⏸️ Demande de certification suspendue",
                "Votre demande de certification a été mise en suspens. Raison : " + reason + ". Un administrateur vous recontactera pour plus d'informations."
        );

        log.info("Certification request {} suspended by admin {}: {}", requestId, adminId, reason);
        return toResponse(request);
    }

    /**
     * User: Cancel a pending request.
     */
    @Transactional
    public CertificationResponseDTO cancelRequest(Long requestId, Long userId) {
        CertificationRequest request = certificationRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande de certification non trouvée"));

        if (!request.getUser().getId().equals(userId)) {
            throw new IllegalStateException("Vous ne pouvez annuler que vos propres demandes.");
        }

        if (request.getStatus() != CertificationStatus.PENDING) {
            throw new IllegalStateException("Vous ne pouvez annuler qu'une demande en attente.");
        }

        request.setStatus(CertificationStatus.CANCELLED);
        certificationRepository.save(request);

        log.info("Certification request {} cancelled by user {}", requestId, userId);
        return toResponse(request);
    }

    /**
     * Get pending certification request count (admin badge).
     */
    public long getPendingCount() {
        return certificationRepository.countByStatus(CertificationStatus.PENDING);
    }

    /**
     * Get certification stats (admin).
     */
    public java.util.Map<String, Object> getCertificationStats() {
        long pending = certificationRepository.countByStatus(CertificationStatus.PENDING);
        long approved = certificationRepository.countByStatus(CertificationStatus.APPROVED);
        long rejected = certificationRepository.countByStatus(CertificationStatus.REJECTED);
        long total = certificationRepository.count();

        long suspended = certificationRepository.countByStatus(CertificationStatus.SUSPENDED);

        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("pending", pending);
        stats.put("approved", approved);
        stats.put("rejected", rejected);
        stats.put("suspended", suspended);
        stats.put("total", total);
        stats.put("approvalRate", total > 0 ? Math.round((double) approved / total * 100) : 0);
        return stats;
    }

    /**
     * Check if user is eligible for certification.
     */
    public java.util.Map<String, Object> checkEligibility(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        long completedReturns = returnRequestRepository.findByLoserIdOrFinderIdOrderByCreatedAtDesc(userId, userId)
                .stream()
                .filter(rr -> rr.getStatus() == ReturnStatus.PAYMENT_COMPLETED)
                .filter(rr -> Boolean.TRUE.equals(rr.getLoserReturnConfirmed()) && Boolean.TRUE.equals(rr.getFinderReturnConfirmed()))
                .count();

        boolean isEligible = !Boolean.TRUE.equals(user.getBanned())
                && !Boolean.TRUE.equals(user.getVerified())
                && (completedReturns >= MIN_COMPLETED_RETURNS || user.getTrustScore() >= MIN_TRUST_SCORE);

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("eligible", isEligible);
        result.put("active", !Boolean.TRUE.equals(user.getBanned()));
        result.put("notVerified", !Boolean.TRUE.equals(user.getVerified()));
        result.put("completedReturns", completedReturns);
        result.put("minReturns", MIN_COMPLETED_RETURNS);
        result.put("trustScore", user.getTrustScore());
        result.put("minTrustScore", MIN_TRUST_SCORE);
        result.put("hasPending", certificationRepository.existsByUserIdAndStatus(userId, CertificationStatus.PENDING));

        return result;
    }

    private CertificationResponseDTO toResponse(CertificationRequest request) {
        return CertificationResponseDTO.builder()
                .id(request.getId())
                .userId(request.getUser().getId())
                .userName(request.getUser().getName())
                .documentType(request.getDocumentType())
                .documentUrl(request.getDocumentUrl())
                .selfieUrl(request.getSelfieUrl())
                .status(request.getStatus().name())
                .activeStatus(request.getActiveStatus())
                .returnCountAtSubmission(request.getReturnCountAtSubmission())
                .trustScoreAtSubmission(request.getTrustScoreAtSubmission())
                .rejectionReason(request.getRejectionReason())
                .adminNotes(request.getAdminNotes())
                .reviewedBy(request.getReviewedBy())
                .reviewedAt(request.getReviewedAt())
                .createdAt(request.getCreatedAt())
                .build();
    }
}
