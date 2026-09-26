package com.retrouvit.service;

import com.retrouvit.dto.*;
import com.retrouvit.entity.Role;
import com.retrouvit.entity.User;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.PasswordResetTokenRepository;
import com.retrouvit.repository.RefreshTokenRepository;
import com.retrouvit.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService — Tests unitaires")
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

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

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .name("Landry Tagne")
                .email("landry@retrouvit.com")
                .password("hashedPassword")
                .role(Role.USER)
                .trustScore(50)
                .objectsFound(0)
                .objectsLost(0)
                .matches(0)
                .verified(false)
                .walletBalance(0L)
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ─── REGISTER ────────────────────────────────────────────────────

    @Test
    @DisplayName("register — devrait créer un utilisateur USER par défaut")
    void register_shouldCreateUserWithDefaultRole() {
        when(userRepository.existsByEmail("landry@retrouvit.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });

        RegisterRequest request = new RegisterRequest("Landry Tagne", "landry@retrouvit.com", "password123", null);
        UserResponse response = userService.register(request);

        assertThat(response.getName()).isEqualTo("Landry Tagne");
        assertThat(response.getEmail()).isEqualTo("landry@retrouvit.com");
        assertThat(response.getRole()).isEqualTo("USER");

        verify(userRepository).save(argThat(u -> u.getRole() == Role.USER));
    }

    @Test
    @DisplayName("register — ne doit JAMAIS créer un ADMIN même si role = ADMIN (audit C1)")
    void register_shouldNeverCreateAdminEvenWhenRequested() {
        when(userRepository.existsByEmail("admin@retrouvit.com")).thenReturn(false);
        when(passwordEncoder.encode("admin123")).thenReturn("hashedAdmin");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(2L);
            return u;
        });

        // Ancien comportement vulnérable : le rôle venait du client (escalade
        // anonyme, confirmée par test réel lors de l'audit). Il est désormais
        // systématiquement écrasé à USER.
        RegisterRequest request = new RegisterRequest("Admin", "admin@retrouvit.com", "admin123", "ADMIN");
        UserResponse response = userService.register(request);

        assertThat(response.getRole()).isEqualTo("USER");
        verify(userRepository).save(argThat(u -> u.getRole() == Role.USER));
    }

    @Test
    @DisplayName("register — devrait lever une exception si l'email existe déjà")
    void register_shouldThrowWhenEmailExists() {
        when(userRepository.existsByEmail("landry@retrouvit.com")).thenReturn(true);

        RegisterRequest request = new RegisterRequest("Landry", "landry@retrouvit.com", "pass", null);

        assertThatThrownBy(() -> userService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("existe déjà");

        verify(userRepository, never()).save(any());
    }

    // ─── LOGIN ───────────────────────────────────────────────────────

    @Test
    @DisplayName("login — devrait retourner un token JWT")
    void login_shouldReturnToken() {
        when(userRepository.findByEmail("landry@retrouvit.com")).thenReturn(Optional.of(testUser));
        when(jwtService.generateToken("landry@retrouvit.com", "USER")).thenReturn("mock-jwt-token");

        AuthResponse response = userService.login(new AuthRequest("landry@retrouvit.com", "password123"));

        assertThat(response.getToken()).isEqualTo("mock-jwt-token");
        assertThat(response.getEmail()).isEqualTo("landry@retrouvit.com");
        assertThat(response.getRole()).isEqualTo("USER");

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    @DisplayName("login — devrait lever une exception si l'utilisateur n'existe pas après auth")
    void login_shouldThrowWhenUserNotFoundAfterAuth() {
        when(authenticationManager.authenticate(any())).thenReturn(null);
        when(userRepository.findByEmail("unknown@retrouvit.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.login(new AuthRequest("unknown@retrouvit.com", "pass")))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── GET USER BY ID ──────────────────────────────────────────────

    @Test
    @DisplayName("getUserById — devrait retourner l'utilisateur")
    void getUserById_shouldReturnUser() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        UserResponse response = userService.getUserById(1L);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getName()).isEqualTo("Landry Tagne");
        assertThat(response.getEmail()).isEqualTo("landry@retrouvit.com");
    }

    @Test
    @DisplayName("getUserById — devrait lever une exception si inexistant")
    void getUserById_shouldThrowWhenNotFound() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getUserById(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── GET ALL USERS ───────────────────────────────────────────────

    @Test
    @DisplayName("getAllUsers — devrait retourner la liste complète")
    void getAllUsers_shouldReturnList() {
        User secondUser = User.builder().id(2L).name("Marie").email("marie@test.com")
                .password("x").role(Role.USER).trustScore(50).objectsFound(0).objectsLost(0)
                .matches(0).verified(false).walletBalance(0L).build();
        when(userRepository.findAll()).thenReturn(List.of(testUser, secondUser));

        List<UserResponse> users = userService.getAllUsers();

        assertThat(users).hasSize(2);
        assertThat(users.get(0).getName()).isEqualTo("Landry Tagne");
        assertThat(users.get(1).getName()).isEqualTo("Marie");
    }

    // ─── UPDATE USER ─────────────────────────────────────────────────

    @Test
    @DisplayName("updateUser — devrait mettre à jour les champs non nuls")
    void updateUser_shouldUpdateFields() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateUserRequest request = new UpdateUserRequest();
        request.setName("Landry T.");
        request.setLocation("Douala");

        UserResponse response = userService.updateUser(1L, request);

        assertThat(response.getName()).isEqualTo("Landry T.");
        assertThat(response.getLocation()).isEqualTo("Douala");
        // Email inchangé
        assertThat(response.getEmail()).isEqualTo("landry@retrouvit.com");
    }

    @Test
    @DisplayName("updateUser — devrait encoder le nouveau mot de passe")
    void updateUser_shouldEncodeNewPassword() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode("newPass")).thenReturn("newHashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateUserRequest request = new UpdateUserRequest();
        request.setPassword("newPass");

        userService.updateUser(1L, request);

        verify(passwordEncoder).encode("newPass");
        assertThat(testUser.getPassword()).isEqualTo("newHashed");
    }

    @Test
    @DisplayName("updateUser — devrait lever une exception si l'utilisateur n'existe pas")
    void updateUser_shouldThrowWhenNotFound() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateUser(999L, new UpdateUserRequest()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── DELETE USER ─────────────────────────────────────────────────

    @Test
    @DisplayName("deleteUser — devrait supprimer si l'utilisateur existe")
    void deleteUser_shouldDelete() {
        when(userRepository.existsById(1L)).thenReturn(true);

        userService.deleteUser(1L);

        verify(userRepository).deleteById(1L);
    }

    @Test
    @DisplayName("deleteUser — devrait lever une exception si inexistant")
    void deleteUser_shouldThrowWhenNotFound() {
        when(userRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> userService.deleteUser(999L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(userRepository, never()).deleteById(any());
    }

    // ─── FIND BY EMAIL ───────────────────────────────────────────────

    @Test
    @DisplayName("findUserByEmail — devrait retourner l'utilisateur")
    void findUserByEmail_shouldReturnUser() {
        when(userRepository.findByEmail("landry@retrouvit.com")).thenReturn(Optional.of(testUser));

        User result = userService.findUserByEmail("landry@retrouvit.com");

        assertThat(result.getName()).isEqualTo("Landry Tagne");
    }

    @Test
    @DisplayName("findUserByEmail — devrait lever une exception si inexistant")
    void findUserByEmail_shouldThrowWhenNotFound() {
        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.findUserByEmail("unknown@test.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
