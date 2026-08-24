package com.retrouvit.service;

import com.retrouvit.entity.*;
import com.retrouvit.repository.FoundObjectRepository;
import com.retrouvit.repository.LostObjectRepository;
import com.retrouvit.repository.MatchRepository;
import com.retrouvit.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MatchingEngine — Tests unitaires")
class MatchingEngineTest {

    @Mock
    private LostObjectRepository lostObjectRepository;

    @Mock
    private FoundObjectRepository foundObjectRepository;

    @Mock
    private MatchRepository matchRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private MatchingEngine matchingEngine;

    private User user1;
    private User user2;
    private LostObject lostPhone;
    private FoundObject foundPhone;
    private LostObject lostKeys;
    private FoundObject foundKeys;

    @BeforeEach
    void setUp() {
        user1 = User.builder()
                .id(1L).name("Landry").email("landry@test.com").password("x")
                .role(Role.USER).trustScore(50).objectsFound(0).objectsLost(0)
                .matches(0).verified(false).walletBalance(0L).build();

        user2 = User.builder()
                .id(2L).name("Marie").email("marie@test.com").password("x")
                .role(Role.USER).trustScore(50).objectsFound(0).objectsLost(0)
                .matches(0).verified(false).walletBalance(0L).build();

        lostPhone = LostObject.builder()
                .id(10L)
                .title("iPhone 15 Pro Max perdu")
                .description("Perdu dans le quartier Bastos, Yaoundé. Téléphone noir avec coque.")
                .category("Électronique")
                .location("Bastos")
                .city("Yaoundé")
                .dateLost(LocalDate.of(2025, 8, 15))
                .status(ObjectStatus.ACTIVE)
                .user(user1)
                .build();

        foundPhone = FoundObject.builder()
                .id(20L)
                .title("iPhone trouvé au distributeur")
                .description("iPhone trouvé près d'un distributeur UBA à Messa, Yaoundé. Écran allumé.")
                .category("Électronique")
                .location("Messa")
                .city("Yaoundé")
                .dateFound(LocalDate.of(2025, 8, 19))
                .status(ObjectStatus.ACTIVE)
                .user(user2)
                .build();

        lostKeys = LostObject.builder()
                .id(30L)
                .title("Trousseau de clés perdu")
                .description("Trousseau de clés perdu au Marché Central, Yaoundé. Porte-clés en cuir marron.")
                .category("Clés")
                .location("Centre-ville")
                .city("Yaoundé")
                .dateLost(LocalDate.of(2025, 8, 18))
                .status(ObjectStatus.ACTIVE)
                .user(user1)
                .build();

        foundKeys = FoundObject.builder()
                .id(40L)
                .title("Trousseau de clés trouvé")
                .description("Trousseau de clés trouvé au Marché Central. Porte-clés en cuir.")
                .category("Clés")
                .location("Centre-ville")
                .city("Yaoundé")
                .dateFound(LocalDate.of(2025, 8, 17))
                .status(ObjectStatus.ACTIVE)
                .user(user2)
                .build();
    }

    // ─── RUN MATCHING ────────────────────────────────────────────────

    @Test
    @DisplayName("runMatching — devrait créer un match si score ≥ 60 (même catégorie + même ville)")
    void runMatching_shouldCreateMatchWhenScoreHighEnough() {
        when(lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(lostPhone));
        when(foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(foundPhone));
        when(matchRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Collections.emptyList());

        matchingEngine.runMatching();

        verify(matchRepository).save(argThat(match ->
                match.getMatchScore() >= 60 &&
                match.getLostObject().getTitle().contains("iPhone") &&
                match.getFoundObject().getTitle().contains("iPhone")
        ));
        verify(notificationService).createMatchNotification(
                eq(1L), any(), anyInt(), anyString(), anyString()
        );
        verify(userRepository).save(argThat(u -> u.getMatches() == 1));
    }

    @Test
    @DisplayName("runMatching — ne devrait pas créer de match si score < 60")
    void runMatching_shouldNotCreateMatchWhenScoreTooLow() {
        // Objets très différents → score faible
        LostObject lostCat = LostObject.builder()
                .id(50L).title("Chat persan perdu").description("Chat gris")
                .category("Animaux").location("Nlongkak").city("Yaoundé")
                .dateLost(LocalDate.now()).status(ObjectStatus.ACTIVE).user(user1).build();

        FoundObject foundBag = FoundObject.builder()
                .id(60L).title("Sac à main Hermès trouvé").description("Sac beige")
                .category("Sacs & Bagages").location("Carrefour Warda").city("Douala")
                .dateFound(LocalDate.now()).status(ObjectStatus.ACTIVE).user(user2).build();

        when(lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(lostCat));
        when(foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(foundBag));
        when(matchRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Collections.emptyList());

        matchingEngine.runMatching();

        verify(matchRepository, never()).save(any());
        verify(notificationService, never()).createMatchNotification(anyLong(), anyLong(), anyInt(), anyString(), anyString());
    }

    @Test
    @DisplayName("runMatching — ne devrait pas dupliquer un match existant")
    void runMatching_shouldNotDuplicateExistingMatch() {
        Match existingMatch = Match.builder()
                .id(1L).lostObject(lostPhone).foundObject(foundPhone)
                .matchScore(80).user(user1).status(MatchStatus.PENDING).build();

        when(lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(lostPhone));
        when(foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(foundPhone));
        when(matchRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(existingMatch));

        matchingEngine.runMatching();

        verify(matchRepository, never()).save(any());
    }

    @Test
    @DisplayName("runMatching — devrait créer plusieurs matches si plusieurs paires correspondent")
    void runMatching_shouldCreateMultipleMatches() {
        when(lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(lostPhone, lostKeys));
        when(foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(foundPhone, foundKeys));
        when(matchRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Collections.emptyList());

        matchingEngine.runMatching();

        // iPhone perdu ↔ iPhone trouvé = bon match (même catégorie + même ville)
        // Clés perdues ↔ Clés trouvées = bon match (même catégorie)
        verify(matchRepository, atLeast(2)).save(any());
    }

    @Test
    @DisplayName("runMatching — devrait gérer une liste vide d'objets")
    void runMatching_shouldHandleEmptyLists() {
        when(lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(Collections.emptyList());
        when(foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(foundPhone));

        matchingEngine.runMatching();

        verify(matchRepository, never()).save(any());
    }

    // ─── MATCH FOR OBJECT ────────────────────────────────────────────

    @Test
    @DisplayName("matchForObject — devrait trouver un match pour un objet spécifique")
    void matchForObject_shouldFindMatch() {
        when(lostObjectRepository.findById(10L)).thenReturn(java.util.Optional.of(lostPhone));
        when(foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(foundPhone));
        when(matchRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Collections.emptyList());

        matchingEngine.matchForObject(10L);

        verify(matchRepository).save(argThat(match ->
                match.getMatchScore() >= 60
        ));
        verify(notificationService).createMatchNotification(
                eq(1L), any(), anyInt(), anyString(), anyString()
        );
    }

    @Test
    @DisplayName("matchForObject — ne devrait rien faire si l'objet n'existe pas")
    void matchForObject_shouldDoNothingWhenNotFound() {
        when(lostObjectRepository.findById(999L)).thenReturn(java.util.Optional.empty());

        matchingEngine.matchForObject(999L);

        verify(foundObjectRepository, never()).findByStatusOrderByCreatedAtDesc(any());
        verify(matchRepository, never()).save(any());
    }

    // ─── SCORE CALCULATION (via runMatching behavior) ────────────────

    @Test
    @DisplayName("runMatching — score élevé pour catégorie + ville identiques avec mots communs")
    void runMatching_highScoreForIdenticalCategoryAndCity() {
        when(lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(lostPhone));
        when(foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(foundPhone));
        when(matchRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Collections.emptyList());

        matchingEngine.runMatching();

        // Category=Électronique (40) + City=Yaoundé (30) + words "iphone" "trouvé" etc. = high score
        verify(matchRepository).save(argThat(match -> match.getMatchScore() >= 60));
    }

    @Test
    @DisplayName("runMatching — score faible pour catégorie et ville différentes")
    void runMatching_lowScoreForDifferentCategoryAndCity() {
        LostObject lostCat = LostObject.builder()
                .id(50L).title("Chat persan perdu").description("Chat gris et blanc")
                .category("Animaux").location("Nlongkak").city("Yaoundé")
                .dateLost(LocalDate.now()).status(ObjectStatus.ACTIVE).user(user1).build();

        FoundObject foundBijou = FoundObject.builder()
                .id(70L).title("Bague dorée trouvée").description("Bague en or au parc")
                .category("Bijoux").location("Parc Monument").city("Bamenda")
                .dateFound(LocalDate.now()).status(ObjectStatus.ACTIVE).user(user2).build();

        when(lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(lostCat));
        when(foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(foundBijou));
        when(matchRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Collections.emptyList());

        matchingEngine.runMatching();

        // Animaux ≠ Bijoux (0) + Yaoundé ≠ Bamenda (5) + words ≠ (0) = 5 < 60
        verify(matchRepository, never()).save(any());
    }
}
