package com.retrouvit.service;

import com.retrouvit.dto.*;
import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.PasswordResetTokenRepository;
import com.retrouvit.repository.RefreshTokenRepository;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OtpService otpService;

    public AuthResponse login(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        return buildAuthResponse(user, null, null);
    }

    /** Variante du login prenant en charge les métadonnées de session
     * (User-Agent, IP) captées par le contrôleur — cahier des charges §5.1.
     * Si la 2FA est activée pour le compte, un code OTP est envoyé et
     * aucun token n'est émis tant que le code n'est pas vérifié (CDC §6.1).
     */
    public AuthResponse login(AuthRequest request, String userAgent, String ipAddress) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        if (!Boolean.TRUE.equals(user.getEnabled())) {
            throw new IllegalArgumentException("Ce compte n'est pas activé — vérifiez votre email (code d'activation)");
        }

        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            String masked = otpService.generateAndSendOtp(user.getEmail(), "LOGIN");
            return AuthResponse.builder()
                    .email(user.getEmail())
                    .otpRequired(true)
                    .maskedEmail(masked)
                    .message("Code de vérification envoyé par email")
                    .build();
        }

        return buildAuthResponse(user, userAgent, ipAddress);
    }

    /** Émission des tokens après validation OTP (flux 2FA — contrôleur OtpController). */
    @Transactional
    public AuthResponse buildAuthResponseForVerifiedUser(User user) {
        return buildAuthResponse(user, null, null);
    }

    private AuthResponse buildAuthResponse(User user, String userAgent, String ipAddress) {
        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken(user.getEmail(), user.getRole().name());

        // Persist refresh token in DB avec métadonnées d'appareil
        RefreshToken persistedRefreshToken = RefreshToken.builder()
                .token(refreshToken)
                .user(user)
                .expiresAt(LocalDateTime.now().plusSeconds(jwtService.getRefreshExpirationMillis() / 1000))
                .deviceInfo(truncate(userAgent, 255))
                .ipAddress(truncate(ipAddress, 45))
                .build();
        refreshTokenRepository.save(persistedRefreshToken);

        return AuthResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .token(token)
                .refreshToken(refreshToken)
                .expiresIn(jwtService.getAccessExpirationMillis() / 1000) // 1 hour in seconds
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }

    /** Tronque une chaîne à la longueur max de la colonne (évite les erreurs SQL). */
    private String truncate(String value, int maxLength) {
        if (value == null) return null;
        return value.length() <= maxLength ? value : value.substring(0, maxLength - 1);
    }

    @Transactional
    public AuthResponse refreshAccessToken(String refreshTokenValue) {
        // 1. Validate JWT structure
        if (!jwtService.isTokenValid(refreshTokenValue)) {
            throw new IllegalArgumentException("Refresh token invalide ou expiré");
        }

        // 2. Ensure it's a refresh token (not an access token)
        if (!jwtService.isRefreshToken(refreshTokenValue)) {
            throw new IllegalArgumentException("Ce n'est pas un refresh token");
        }

        // 3. Check DB record exists and is not revoked
        RefreshToken storedToken = refreshTokenRepository.findByToken(refreshTokenValue)
                .orElseThrow(() -> new IllegalArgumentException("Refresh token non trouvé"));

        if (storedToken.isRevoked()) {
            // Possible token reuse attack — revoke all tokens for this user
            log.warn("Refresh token reuse detected for user {} — revoking all tokens", storedToken.getUser().getEmail());
            refreshTokenRepository.revokeAllByUserId(storedToken.getUser().getId());
            throw new IllegalArgumentException("Refresh token révoqué (réutilisation détectée)");
        }

        // 4. Revoke old refresh token (rotation)
        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        // 5. Generate new token pair
        User user = storedToken.getUser();
        String newAccessToken = jwtService.generateToken(user.getEmail(), user.getRole().name());
        String newRefreshToken = jwtService.generateRefreshToken(user.getEmail(), user.getRole().name());

        // 6. Persist new refresh token (hérite des métadonnées de l'ancien : même appareil)
        RefreshToken newPersistedToken = RefreshToken.builder()
                .token(newRefreshToken)
                .user(user)
                .expiresAt(LocalDateTime.now().plusSeconds(jwtService.getRefreshExpirationMillis() / 1000))
                .deviceInfo(storedToken.getDeviceInfo())
                .ipAddress(storedToken.getIpAddress())
                .build();
        refreshTokenRepository.save(newPersistedToken);

        return AuthResponse.builder()
                .token(newAccessToken)
                .refreshToken(newRefreshToken)
                .expiresIn(jwtService.getAccessExpirationMillis() / 1000)
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }

    @Transactional
    public void logout(String refreshTokenValue) {
        if (refreshTokenValue != null) {
            refreshTokenRepository.findByToken(refreshTokenValue)
                    .ifPresent(token -> {
                        token.setRevoked(true);
                        refreshTokenRepository.save(token);
                    });
        }
    }

    @Transactional
    public void logoutAll(Long userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    /**
     * Liste des sessions/appareils actifs de l'utilisateur — CDC §5.1.
     * Une session est "active" si son refresh token n'est ni révoqué ni expiré.
     * Le token lui-même n'est jamais exposé, seules ses métadonnées.
     */
    @Transactional(readOnly = true)
    public List<SessionResponse> getActiveSessions(Long userId, String currentUserRefreshToken) {
        return refreshTokenRepository.findByUserIdAndRevokedFalseOrderByCreatedAtDesc(userId).stream()
                .filter(t -> !t.isExpired())
                .map(t -> SessionResponse.builder()
                        .id(t.getId())
                        .deviceInfo(t.getDeviceInfo())
                        .ipAddress(t.getIpAddress())
                        .createdAt(t.getCreatedAt())
                        .expiresAt(t.getExpiresAt())
                        .current(currentUserRefreshToken != null && t.getToken().equals(currentUserRefreshToken))
                        .expired(false)
                        .build())
                .collect(Collectors.toList());
    }

    /** Révoque une session spécifique (déconnexion d'un appareil distant). */
    @Transactional
    public void revokeSession(Long userId, Long sessionId) {
        RefreshToken token = refreshTokenRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session non trouvée"));
        if (!token.getUser().getId().equals(userId)) {
            // Une session ne peut être révoquée que par son propriétaire
            throw new ResourceNotFoundException("Session non trouvée");
        }
        token.setRevoked(true);
        refreshTokenRepository.save(token);
    }

    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Un compte avec cet email existe déjà");
        }

        Role role = request.getRole() != null && request.getRole().equals("ADMIN")
                ? Role.ADMIN : Role.USER;

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .build();

        User savedUser = userRepository.save(user);
        return toResponse(savedUser);
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        return toResponse(user);
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        if (request.getName() != null) user.setName(request.getName());
        if (request.getEmail() != null) user.setEmail(request.getEmail());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getLocation() != null) user.setLocation(request.getLocation());
        if (request.getAvatar() != null) user.setAvatar(request.getAvatar());
        if (request.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        User savedUser = userRepository.save(user);
        return toResponse(savedUser);
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("Utilisateur non trouvé");
        }
        userRepository.deleteById(id);
    }

    public User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
    }

    public String forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token(token)
                .user(user)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();

        passwordResetTokenRepository.save(resetToken);

        // In production, send email here. For now, log the token.
        log.info("Password reset token for {}: {}", email, token);

        return token;
    }

    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new IllegalArgumentException("Token de réinitialisation invalide"));

        if (resetToken.isExpired()) {
            throw new IllegalArgumentException("Token de réinitialisation expiré");
        }

        if (resetToken.isUsed()) {
            throw new IllegalArgumentException("Token de réinitialisation déjà utilisé");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
    }

    private UserResponse toResponse(User user) {
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
                .createdAt(user.getCreatedAt())
                .build();
    }
}
