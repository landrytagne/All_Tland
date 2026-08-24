package com.retrouvit.service;

import com.retrouvit.dto.FoundObjectRequest;
import com.retrouvit.dto.FoundObjectResponse;
import com.retrouvit.entity.FoundObject;
import com.retrouvit.entity.ObjectStatus;
import com.retrouvit.entity.Role;
import com.retrouvit.entity.User;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.FoundObjectRepository;
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
@DisplayName("FoundObjectService — Tests unitaires")
class FoundObjectServiceTest {

    @Mock
    private FoundObjectRepository foundObjectRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FoundObjectService foundObjectService;

    private User testUser;
    private FoundObject testFoundObject;
    private FoundObjectRequest testRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(2L)
                .name("Marie Ngono")
                .email("marie@retrouvit.com")
                .password("hashedPassword")
                .role(Role.USER)
                .trustScore(88)
                .objectsFound(3)
                .objectsLost(0)
                .matches(2)
                .verified(true)
                .walletBalance(10000L)
                .createdAt(LocalDateTime.now())
                .build();

        testFoundObject = FoundObject.builder()
                .id(200L)
                .title("Portefeuille en cuir")
                .description("Trouvé un portefeuille près de la station Total Mokolo")
                .category("Documents")
                .location("Mokolo")
                .city("Yaoundé")
                .dateFound(LocalDate.of(2025, 8, 18))
                .views(0)
                .status(ObjectStatus.ACTIVE)
                .user(testUser)
                .createdAt(LocalDateTime.now())
                .build();

        testRequest = FoundObjectRequest.builder()
                .title("Portefeuille en cuir")
                .description("Trouvé un portefeuille près de la station Total Mokolo")
                .category("Documents")
                .location("Mokolo")
                .city("Yaoundé")
                .dateFound(LocalDate.of(2025, 8, 18))
                .build();
    }

    // ─── CREATE ──────────────────────────────────────────────────────

    @Test
    @DisplayName("create — devrait créer un objet trouvé et incrémenter le compteur")
    void create_shouldCreateFoundObject() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(testUser));
        when(foundObjectRepository.save(any(FoundObject.class))).thenAnswer(invocation -> {
            FoundObject obj = invocation.getArgument(0);
            obj.setId(200L);
            return obj;
        });

        FoundObjectResponse response = foundObjectService.create(testRequest, 2L);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Portefeuille en cuir");
        assertThat(response.getCategory()).isEqualTo("Documents");
        assertThat(response.getCity()).isEqualTo("Yaoundé");
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
        assertThat(response.getUser().getName()).isEqualTo("Marie Ngono");

        verify(userRepository).findById(2L);
        verify(foundObjectRepository).save(any(FoundObject.class));
        verify(userRepository).save(testUser);
        assertThat(testUser.getObjectsFound()).isEqualTo(4); // 3 + 1
    }

    @Test
    @DisplayName("create — devrait définir la date du jour si dateFound est null")
    void create_shouldUseTodayDateWhenNull() {
        FoundObjectRequest requestNoDate = FoundObjectRequest.builder()
                .title("Clés trouvées")
                .description("Un trousseau de clés")
                .category("Clés")
                .location("Centre-ville")
                .city("Douala")
                .build();

        when(userRepository.findById(2L)).thenReturn(Optional.of(testUser));
        when(foundObjectRepository.save(any(FoundObject.class))).thenAnswer(invocation -> {
            FoundObject obj = invocation.getArgument(0);
            obj.setId(300L);
            return obj;
        });

        FoundObjectResponse response = foundObjectService.create(requestNoDate, 2L);

        assertThat(response.getDateFound()).isEqualTo(LocalDate.now());
    }

    @Test
    @DisplayName("create — devrait lancer une exception si l'utilisateur n'existe pas")
    void create_shouldThrowWhenUserNotFound() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> foundObjectService.create(testRequest, 999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Utilisateur non trouvé");

        verify(foundObjectRepository, never()).save(any());
    }

    // ─── GET BY ID ───────────────────────────────────────────────────

    @Test
    @DisplayName("getById — devrait retourner l'objet et incrémenter les vues")
    void getById_shouldReturnObjectAndIncrementViews() {
        when(foundObjectRepository.findById(200L)).thenReturn(Optional.of(testFoundObject));
        when(foundObjectRepository.save(any(FoundObject.class))).thenReturn(testFoundObject);

        FoundObjectResponse response = foundObjectService.getById(200L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(200L);
        assertThat(response.getTitle()).isEqualTo("Portefeuille en cuir");
        assertThat(testFoundObject.getViews()).isEqualTo(1);

        verify(foundObjectRepository).save(testFoundObject);
    }

    @Test
    @DisplayName("getById — devrait lancer une exception si l'objet n'existe pas")
    void getById_shouldThrowWhenNotFound() {
        when(foundObjectRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> foundObjectService.getById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Objet trouvé non trouvé");
    }

    // ─── GET ALL (paginated) ────────────────────────────────────────

    @Test
    @DisplayName("getAll — devrait retourner tous les objets actifs")
    void getAll_shouldReturnAllActiveObjects() {
        when(foundObjectRepository.findAllActive(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(testFoundObject)));

        var response = foundObjectService.getAll(0, 12);

        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getContent().get(0).getTitle()).isEqualTo("Portefeuille en cuir");
    }

    @Test
    @DisplayName("getAll — devrait retourner une liste vide si aucun objet actif")
    void getAll_shouldReturnEmptyList() {
        when(foundObjectRepository.findAllActive(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        var response = foundObjectService.getAll(0, 12);

        assertThat(response.getContent()).isEmpty();
    }

    // ─── GET BY USER ID ──────────────────────────────────────────────

    @Test
    @DisplayName("getByUserId — devrait retourner les objets d'un utilisateur")
    void getByUserId_shouldReturnUserObjects() {
        when(foundObjectRepository.findByUserIdOrderByCreatedAtDesc(2L))
                .thenReturn(List.of(testFoundObject));

        List<FoundObjectResponse> responses = foundObjectService.getByUserId(2L);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getUser().getId()).isEqualTo(2L);
    }

    // ─── GET BY CATEGORY (paginated) ─────────────────────────────────

    @Test
    @DisplayName("getByCategory — devrait filtrer par catégorie")
    void getByCategory_shouldFilterByCategory() {
        when(foundObjectRepository.findByCategoryAndStatusOrderByCreatedAtDesc(
                eq("Documents"), eq(ObjectStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(testFoundObject)));

        var response = foundObjectService.getByCategory("Documents", 0, 12);

        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getContent().get(0).getCategory()).isEqualTo("Documents");
    }

    // ─── GET BY CITY (paginated) ─────────────────────────────────────

    @Test
    @DisplayName("getByCity — devrait filtrer par ville")
    void getByCity_shouldFilterByCity() {
        when(foundObjectRepository.findByCityAndStatusOrderByCreatedAtDesc(
                eq("Yaoundé"), eq(ObjectStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(testFoundObject)));

        var response = foundObjectService.getByCity("Yaoundé", 0, 12);

        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getContent().get(0).getCity()).isEqualTo("Yaoundé");
    }

    // ─── UPDATE ──────────────────────────────────────────────────────

    @Test
    @DisplayName("update — devrait mettre à jour les champs modifiés")
    void update_shouldUpdateFields() {
        FoundObjectRequest updateRequest = FoundObjectRequest.builder()
                .title("Portefeuille en cuir — récupéré !")
                .build();

        when(foundObjectRepository.findById(200L)).thenReturn(Optional.of(testFoundObject));
        when(foundObjectRepository.save(any(FoundObject.class))).thenAnswer(inv -> inv.getArgument(0));

        FoundObjectResponse response = foundObjectService.update(200L, updateRequest, 2L);

        assertThat(response.getTitle()).isEqualTo("Portefeuille en cuir — récupéré !");
        // Les champs non modifiés restent inchangés
        assertThat(response.getCategory()).isEqualTo("Documents");
        assertThat(response.getCity()).isEqualTo("Yaoundé");
    }

    @Test
    @DisplayName("update — devrait lever une exception si l'annonce n'appartient pas à l'utilisateur")
    void update_shouldThrowWhenNotOwner() {
        FoundObjectRequest updateRequest = FoundObjectRequest.builder()
                .title("Hacké !")
                .build();

        when(foundObjectRepository.findById(200L)).thenReturn(Optional.of(testFoundObject));

        assertThatThrownBy(() -> foundObjectService.update(200L, updateRequest, 999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("vos propres annonces");

        verify(foundObjectRepository, never()).save(any());
    }

    @Test
    @DisplayName("update — devrait lever une exception si l'objet n'existe pas")
    void update_shouldThrowWhenNotFound() {
        when(foundObjectRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> foundObjectService.update(999L, testRequest, 2L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── DELETE ──────────────────────────────────────────────────────

    @Test
    @DisplayName("delete — devrait supprimer l'annonce si c'est le propriétaire")
    void delete_shouldDeleteWhenOwner() {
        when(foundObjectRepository.findById(200L)).thenReturn(Optional.of(testFoundObject));

        foundObjectService.delete(200L, 2L);

        verify(foundObjectRepository).deleteById(200L);
    }

    @Test
    @DisplayName("delete — devrait lever une exception si ce n'est pas le propriétaire")
    void delete_shouldThrowWhenNotOwner() {
        when(foundObjectRepository.findById(200L)).thenReturn(Optional.of(testFoundObject));

        assertThatThrownBy(() -> foundObjectService.delete(200L, 999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("vos propres annonces");

        verify(foundObjectRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("delete — devrait lever une exception si l'objet n'existe pas")
    void delete_shouldThrowWhenNotFound() {
        when(foundObjectRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> foundObjectService.delete(999L, 2L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
