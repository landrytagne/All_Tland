package com.retrouvit.service;

import com.retrouvit.dto.UserResponse;
import com.retrouvit.entity.User;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.UserRepository;
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
public class AdminService {

    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Get all users (admin only).
     */
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get user by ID (admin only).
     */
    public UserResponse getUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        return toUserResponse(user);
    }

    /**
     * Ban a user.
     */
    @Transactional
    public UserResponse banUser(Long userId, String reason, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        if (user.getRole().name().equals("ADMIN")) {
            throw new IllegalArgumentException("Impossible de bannir un administrateur");
        }

        user.setBanned(true);
        user.setBanReason(reason);
        user.setBannedAt(LocalDateTime.now());
        User saved = userRepository.save(user);

        // Notify the banned user
        notificationService.createNotification(
                userId,
                com.retrouvit.entity.NotificationType.SYSTEM,
                "Votre compte a été suspendu",
                reason != null ? reason : "Votre compte a été suspendu par un administrateur."
        );

        log.info("User {} banned by admin {}: {}", userId, adminId, reason);
        return toUserResponse(saved);
    }

    /**
     * Unban a user.
     */
    @Transactional
    public UserResponse unbanUser(Long userId, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        user.setBanned(false);
        user.setBanReason(null);
        user.setBannedAt(null);
        User saved = userRepository.save(user);

        // Notify the unbanned user
        notificationService.createNotification(
                userId,
                com.retrouvit.entity.NotificationType.SYSTEM,
                "Votre compte a été réactivé",
                "Votre compte a été réactivé par un administrateur. Vous pouvez à nouveau accéder à la plateforme."
        );

        log.info("User {} unbanned by admin {}", userId, adminId);
        return toUserResponse(saved);
    }

    /**
     * Verify a user (mark as trusted).
     */
    @Transactional
    public UserResponse verifyUser(Long userId, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        user.setVerified(true);
        User saved = userRepository.save(user);

        // Notify the verified user
        notificationService.createNotification(
                userId,
                com.retrouvit.entity.NotificationType.SYSTEM,
                "Votre compte est désormais vérifié ✓",
                "Félicitations ! Votre compte est maintenant vérifié. Votre score de confiance augmente."
        );

        // Boost trust score
        if (user.getTrustScore() < 80) {
            user.setTrustScore(Math.min(100, user.getTrustScore() + 20));
            userRepository.save(user);
        }

        log.info("User {} verified by admin {}", userId, adminId);
        return toUserResponse(saved);
    }

    /**
     * Unverify a user.
     */
    @Transactional
    public UserResponse unverifyUser(Long userId, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        user.setVerified(false);
        User saved = userRepository.save(user);

        log.info("User {} unverified by admin {}", userId, adminId);
        return toUserResponse(saved);
    }

    /**
     * Change user role.
     */
    @Transactional
    public UserResponse changeRole(Long userId, String newRole, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        com.retrouvit.entity.Role role = com.retrouvit.entity.Role.valueOf(newRole.toUpperCase());
        user.setRole(role);
        User saved = userRepository.save(user);

        log.info("User {} role changed to {} by admin {}", userId, newRole, adminId);
        return toUserResponse(saved);
    }

    /**
     * Delete a user permanently.
     */
    @Transactional
    public void deleteUser(Long userId, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        if (user.getRole().name().equals("ADMIN")) {
            throw new IllegalArgumentException("Impossible de supprimer un administrateur");
        }

        userRepository.deleteById(userId);
        log.info("User {} deleted by admin {}", userId, adminId);
    }

    /**
     * Get banned users.
     */
    public List<UserResponse> getBannedUsers() {
        return userRepository.findAll().stream()
                .filter(User::getBanned)
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get verified users.
     */
    public List<UserResponse> getVerifiedUsers() {
        return userRepository.findAll().stream()
                .filter(User::getVerified)
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .phone(user.getPhone())
                .location(user.getLocation())
                .avatar(user.getAvatar())
                .trustScore(user.getTrustScore())
                .objectsFound(user.getObjectsFound())
                .objectsLost(user.getObjectsLost())
                .matches(user.getMatches())
                .verified(user.getVerified())
                .walletBalance(user.getWalletBalance())
                .banned(user.getBanned())
                .banReason(user.getBanReason())
                .bannedAt(user.getBannedAt())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
