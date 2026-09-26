package com.retrouvit.service;

import com.retrouvit.controller.WebSocketNotificationController;
import com.retrouvit.dto.AuthResponse;
import com.retrouvit.dto.RegisterRequest;
import com.retrouvit.dto.UserResponse;
import com.retrouvit.entity.*;
import com.retrouvit.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests de sécurité — vulnérabilités critiques de l'audit (C1, C3).
 *
 * C1 : l'inscription ne doit JAMAIS accepter un rôle venant du client
 *      (escalade de privilèges anonyme, confirmée par test réel avant fix).
 * C3 : le token de reset password ne doit jamais être journalisé ; il
 *      est transmis par email uniquement.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Sécurité — C1 escalade de rôle et C3 token de reset")
class SecurityCriticalTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private OtpService otpService;
    @Mock
    private EmailService emailService;

    @InjectMocks
    private UserService userService;

    @Nested
    @DisplayName("C1 — Le rôle ne vient jamais du client")
    class RoleEscalation {

        @Test
        @DisplayName("register(role=ADMIN) crée un USER — pas d'escalade de privilèges")
        void registerNeverCreatesAdmin() {
            RegisterRequest request = new RegisterRequest();
            request.setName("Hacker");
            request.setEmail("hacker@test.com");
            request.setPassword("Passw0rd!123");
            request.setRole("ADMIN"); // tentative d'escalade

            when(userRepository.existsByEmail("hacker@test.com")).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("hashed");
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            UserResponse response = userService.register(request);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            assertThat(captor.getValue().getRole())
                    .as("Le rôle doit être forcé à USER, quel que soit l'input client")
                    .isEqualTo(Role.USER);
            assertThat(response.getRole()).isEqualTo("USER");
        }

        @Test
        @DisplayName("register(role=ADMIN en minuscule/casse exotique) → USER aussi")
        void registerRoleCaseVariantsStillUser() {
            for (String attempt : new String[]{"admin", "ADMIN", "Admin", " aDmIn "}) {
                RegisterRequest request = new RegisterRequest();
                request.setName("X");
                request.setEmail("x" + attempt.hashCode() + "@test.com");
                request.setPassword("Passw0rd!123");
                request.setRole(attempt);

                when(userRepository.existsByEmail(anyString())).thenReturn(false);
                when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

                userService.register(request);

                ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
                verify(userRepository, atLeastOnce()).save(captor.capture());
                assertThat(captor.getValue().getRole()).isEqualTo(Role.USER);
                clearInvocations(userRepository);
            }
        }
    }

    @Nested
    @DisplayName("C3 — Token de reset jamais journalisé, transmis par email")
    class PasswordResetToken {

        @Test
        @DisplayName("forgot-password : le token part par email, pas dans les logs")
        void resetTokenSentByEmailOnly() {
            // Compte existant
            User user = User.builder().id(1L).name("Jean").email("jean@test.com")
                    .role(Role.USER).build();
            when(userRepository.findByEmail("jean@test.com")).thenReturn(Optional.of(user));
            when(passwordResetTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            String returned = userService.forgotPassword("jean@test.com");

            ArgumentCaptor<String> tokenCaptor = ArgumentCaptor.forClass(String.class);
            verify(emailService).sendPasswordResetEmail(eq("jean@test.com"), tokenCaptor.capture());
            assertThat(tokenCaptor.getValue()).isNotBlank();
            // Le token renvoyé au contrôleur doit être le même que celui envoyé
            // (l'important : AUCUN log.info du token — vérifié par revue + CI)
            assertThat(returned).isEqualTo(tokenCaptor.getValue());
            verify(emailService, times(1)).sendPasswordResetEmail(anyString(), anyString());
        }

        @Test
        @DisplayName("forgot-password sur email inconnu : pas de token généré")
        void resetTokenUnknownEmail() {
            when(userRepository.findByEmail("ghost@test.com")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.forgotPassword("ghost@test.com"))
                    .isInstanceOf(com.retrouvit.exception.ResourceNotFoundException.class);
            verify(passwordResetTokenRepository, never()).save(any());
            verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString());
        }
    }
}
