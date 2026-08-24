package com.retrouvit.service;

import com.retrouvit.dto.LostObjectRequest;
import com.retrouvit.dto.LostObjectResponse;
import com.retrouvit.dto.UserResponse;
import com.retrouvit.entity.LostObject;
import com.retrouvit.entity.ObjectStatus;
import com.retrouvit.entity.Role;
import com.retrouvit.entity.User;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.LostObjectRepository;
import com.retrouvit.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LostObjectService — Tests unitaires")
class LostObjectServiceTest {

    @Mock
    private LostObjectRepository lostObjectRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private LostObjectService lostObjectService;

    private User testUser;
    private LostObject testLostObject;
    private LostObjectRequest testRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .name("Landry Tagne")
                .email("landry@retrouvit.com")
                .password("hashedPassword")
                .role(Role.USER)
                .trustScore(92)
                .objectsFound(0)
                .objectsLost(0)
                .matches(0)
                .verified(true)
                .walletBalance(0L)
                .createdAt(LocalDateTime.now())
                .build();

        testLostObject = LostObject.builder()
                .id(100L)
                .title("iPhone 15 Pro Max perdu")
                .description("Perdu dans le quartier Bastos")
                .category("Électronique")
                .location("Bastos")
                .city("Yaoundé")
                .dateLost(LocalDate.of(2025, 8, 15))
                .reward(25000L)
                .views(0)
                .status(ObjectStatus.ACTIVE)
                .user(testUser)
                .createdAt(LocalDateTime.now())
                .build();

        testRequest = LostObjectRequest.builder()
                .title("iPhone 15 Pro Max perdu")
                .description("Perdu dans le quartier Bastos")
                .category("Électronique")
                .location("Bastos")
                .city("Yaoundé")
                .dateLost(LocalDate.of(2025, 8, 15))
                .reward(25000L)
                .build();
    }

    // ─── CREATE ──────────────────────────────────────────────────────

    @Test
    @DisplayName("create — devrait créer un objet perdu et incrémenter le compteur de l'utilisateur")
    void create_shouldCreateLostObject() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(lostObjectRepository.save(any(LostObject.class))).thenAnswer(invocation -> {
            LostObject obj = invocation.getArgument(0);
            obj.setId(100L);
            return obj;
        });

        LostObjectResponse response = lostObjectService.create(testRequest, 1L);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("iPhone 15 Pro Max perdu");
        assertThat(response.getCategory()).isEqualTo("Électronique");
        assertThat(response.getCity()).isEqualTo("Yaoundé");
        assertThat(response.getReward()).isEqualTo(25000L);
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
        assertThat(response.getUser().getName()).isEqualTo("Landry Tagne");

        verify(userRepository).findById(1L);
        verify(lostObjectRepository).save(any(LostObject.class));
        verify(userRepository).save(testUser);
        assertThat(testUser.getObjectsLost()).isEqualTo(1);
    }

    @Test
    @DisplayName("create — devrait définir la date du jour si dateLost est null")
    void create_shouldUseTodayDateWhenNull() {
        LostObjectRequest requestNoDate = LostObjectRequest.builder()
                .title("Clés perdues")
                .description("Un trousseau de clés")
                .category("Clés")
                .location("Messa")
                .city("Yaoundé")
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(lostObjectRepository.save(any(LostObject.class))).thenAnswer(invocation -> {
            LostObject obj = invocation.getArgument(0);
            obj.setId(200L);
            return obj;
        });

        LostObjectResponse response = lostObjectService.create(requestNoDate, 1L);

        assertThat(response.getDateLost()).isEqualTo(LocalDate.now());
    }

    @Test
    @DisplayName("create — devrait lancer une exception si l'utilisateur n'existe pas")
    void create_shouldThrowWhenUserNotFound() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lostObjectService.create(testRequest, 999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Utilisateur non trouvé");

        verify(lostObjectRepository, never()).save(any());
    }

    // ─── GET BY ID ───────────────────────────────────────────────────

    @Test
    @DisplayName("getById — devrait retourner l'objet et incrémenter les vues")
    void getById_shouldReturnObjectAndIncrementViews() {
        when(lostObjectRepository.findById(100L)).thenReturn(Optional.of(testLostObject));
        when(lostObjectRepository.save(any(LostObject.class))).thenReturn(testLostObject);

        LostObjectResponse response = lostObjectService.getById(100L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getTitle()).isEqualTo("iPhone 15 Pro Max perdu");
        assertThat(testLostObject.getViews()).isEqualTo(1);

        verify(lostObjectRepository).save(testLostObject);
    }

    @Test
    @DisplayName("getById — devrait lancer une exception si l'objet n'existe pas")
    void getById_shouldThrowWhenNotFound() {
        when(lostObjectRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lostObjectService.getById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Objet perdu non trouvé");
    }

    // ─── GET ALL (paginated) ────────────────────────────────────────

    @Test
    @DisplayName("getAll — devrait retourner tous les objets actifs")
    void getAll_shouldReturnAllActiveObjects() {
        when(lostObjectRepository.findAllActive(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(testLostObject)));

        var response = lostObjectService.getAll(0, 12);

        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getContent().get(0).getTitle()).isEqualTo("iPhone 15 Pro Max perdu");
    }

    @Test
    @DisplayName("getAll — devrait retourner une liste vide si aucun objet actif")
    void getAll_shouldReturnEmptyList() {
        when(lostObjectRepository.findAllActive(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        var response = lostObjectService.getAll(0, 12);

        assertThat(response.getContent()).isEmpty();
    }

    // ─── GET BY USER ID ──────────────────────────────────────────────

    @Test
    @DisplayName("getByUserId — devrait retourner les objets d'un utilisateur")
    void getByUserId_shouldReturnUserObjects() {
        when(lostObjectRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(testLostObject));

        List<LostObjectResponse> responses = lostObjectService.getByUserId(1L);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getUser().getId()).isEqualTo(1L);
    }

    // ─── GET BY CATEGORY (paginated) ─────────────────────────────────

    @Test
    @DisplayName("getByCategory — devrait filtrer par catégorie")
    void getByCategory_shouldFilterByCategory() {
        when(lostObjectRepository.findByCategoryAndStatusOrderByCreatedAtDesc(
                eq("Électronique"), eq(ObjectStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(testLostObject)));

        var response = lostObjectService.getByCategory("Électronique", 0, 12);

        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getContent().get(0).getCategory()).isEqualTo("Électronique");
    }

    // ─── GET BY CITY (paginated) ─────────────────────────────────────

    @Test
    @DisplayName("getByCity — devrait filtrer par ville")
    void getByCity_shouldFilterByCity() {
        when(lostObjectRepository.findByCityAndStatusOrderByCreatedAtDesc(
                eq("Yaoundé"), eq(ObjectStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(testLostObject)));

        var response = lostObjectService.getByCity("Yaoundé", 0, 12);

        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getContent().get(0).getCity()).isEqualTo("Yaoundé");
    }

    // ─── UPDATE ──────────────────────────────────────────────────────

    @Test
    @DisplayName("update — devrait mettre à jour les champs modifiés")
    void update_shouldUpdateFields() {
        LostObjectRequest updateRequest = LostObjectRequest.builder()
                .title("iPhone 15 Pro Max — trouvé !")
                .reward(30000L)
                .build();

        when(lostObjectRepository.findById(100L)).thenReturn(Optional.of(testLostObject));
        when(lostObjectRepository.save(any(LostObject.class))).thenAnswer(inv -> inv.getArgument(0));

        LostObjectResponse response = lostObjectService.update(100L, updateRequest, 1L);

        assertThat(response.getTitle()).isEqualTo("iPhone 15 Pro Max — trouvé !");
        assertThat(response.getReward()).isEqualTo(30000L);
        // Les champs non modifiés restent inchangés
        assertThat(response.getCategory()).isEqualTo("Électronique");
        assertThat(response.getCity()).isEqualTo("Yaoundé");
    }

    @Test
    @DisplayName("update — devrait lever une exception si l'annonce n'appartient pas à l'utilisateur")
    void update_shouldThrowWhenNotOwner() {
        LostObjectRequest updateRequest = LostObjectRequest.builder()
                .title("Hacké !")
                .build();

        when(lostObjectRepository.findById(100L)).thenReturn(Optional.of(testLostObject));

        assertThatThrownBy(() -> lostObjectService.update(100L, updateRequest, 999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("vos propres annonces");

        verify(lostObjectRepository, never()).save(any());
    }

    @Test
    @DisplayName("update — devrait lever une exception si l'objet n'existe pas")
    void update_shouldThrowWhenNotFound() {
        when(lostObjectRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lostObjectService.update(999L, testRequest, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── DELETE ──────────────────────────────────────────────────────

    @Test
    @DisplayName("delete — devrait supprimer l'annonce si c'est le propriétaire")
    void delete_shouldDeleteWhenOwner() {
        when(lostObjectRepository.findById(100L)).thenReturn(Optional.of(testLostObject));

        lostObjectService.delete(100L, 1L);

        verify(lostObjectRepository).deleteById(100L);
    }

    @Test
    @DisplayName("delete — devrait lever une exception si ce n'est pas le propriétaire")
    void delete_shouldThrowWhenNotOwner() {
        when(lostObjectRepository.findById(100L)).thenReturn(Optional.of(testLostObject));

        assertThatThrownBy(() -> lostObjectService.delete(100L, 999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("vos propres annonces");

        verify(lostObjectRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("delete — devrait lever une exception si l'objet n'existe pas")
    void delete_shouldThrowWhenNotFound() {
        when(lostObjectRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lostObjectService.delete(999L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
