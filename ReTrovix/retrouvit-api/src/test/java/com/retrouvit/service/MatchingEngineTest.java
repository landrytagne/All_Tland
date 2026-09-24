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
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MatchingEngine — Tests unitaires (CDC §7)")
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

    @Mock
    private PlatformSettingsService platformSettingsService;

    @Spy
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @InjectMocks
    private MatchingEngine matchingEngine;

    private User user1;
    private User user2;
    private LostObject lostPhone;
    private FoundObject foundPhone;

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

        // Perte et découverte à 2 jours d'écart, même ville, descriptions proches
        // (score attendu : texte 25/35 + géo 20/20 + temporel 15/15 = 86/100 sans photo)
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
                .title("iPhone trouvé distributeur Bastos")
                .description("iPhone trouvé près d'un distributeur à Bastos, Yaoundé. Téléphone noir avec coque.")
                .category("Électronique")
                .location("Bastos")
                .city("Yaoundé")
                .dateFound(LocalDate.of(2025, 8, 17))
                .status(ObjectStatus.ACTIVE)
                .user(user2)
                .build();
    }

    private void stubSettings() {
        when(platformSettingsService.getSettingAsInt(anyString())).thenReturn(0); // → fallback CDC (80/90)
    }

    // ─── SCORE CALCULATION ───────────────────────────────────────────

    @Test
    @DisplayName("calculateMatchScore — catégorie différente = score 0 (éliminatoire)")
    void score_shouldBeZeroWhenCategoryDiffers() {
        foundPhone.setCategory("Vêtements");
        MatchingEngine.MatchResult result = matchingEngine.calculateMatchScore(lostPhone, foundPhone);
        assertThat(result.score()).isZero();
        assertThat(result.breakdownJson()).contains("\"category\":0");
    }

    @Test
    @DisplayName("calculateMatchScore — même objet, sans photo : texte+géo+temporel renormalisés sur 100")
    void score_noPhotos_renormalized() {
        // Texte 25/35 (ratio 7/10) + Géo 20/20 + Temporel 15/15 → 86 ≥ seuil 80
        MatchingEngine.MatchResult result = matchingEngine.calculateMatchScore(lostPhone, foundPhone);
        assertThat(result.score()).isGreaterThanOrEqualTo(80); // seuil CDC par défaut
        assertThat(result.breakdownJson()).contains("\"category\":1");
        assertThat(result.breakdownJson()).contains("\"geography\":20");
        assertThat(result.breakdownJson()).contains("\"temporal\":15");
        assertThat(result.breakdownJson()).contains("\"maxRaw\":70"); // 35+20+15 sans photos
    }

    @Test
    @DisplayName("calculateMatchScore — photo identique → 30/30 visuel, maxRaw passe à 100")
    void score_identicalPhoto_fullVisualScore() {
        lostPhone.setImage("uploads/photo-xyz.jpg");
        foundPhone.setImage("uploads/photo-xyz.jpg"); // même fichier
        MatchingEngine.MatchResult result = matchingEngine.calculateMatchScore(lostPhone, foundPhone);
        assertThat(result.breakdownJson()).contains("\"visual\":30");
        assertThat(result.breakdownJson()).contains("\"maxRaw\":100"); // 35+20+15+30
        // 25 (texte) + 20 (géo) + 15 (temporel) + 30 (visuel) = 90
        assertThat(result.score()).isEqualTo(90);
    }

    @Test
    @DisplayName("temporalProximity — dégression par écart de jours (0-3, 4-7, 8-14, 15-30)")
    void temporal_degression() {
        foundPhone.setDateFound(LocalDate.of(2025, 8, 15)); // même jour → 15
        assertThat(matchingEngine.temporalProximity(lostPhone, foundPhone)).isEqualTo(15);

        foundPhone.setDateFound(LocalDate.of(2025, 8, 18)); // 3 jours → 15
        assertThat(matchingEngine.temporalProximity(lostPhone, foundPhone)).isEqualTo(15);

        foundPhone.setDateFound(LocalDate.of(2025, 8, 22)); // 7 jours → 10
        assertThat(matchingEngine.temporalProximity(lostPhone, foundPhone)).isEqualTo(10);

        foundPhone.setDateFound(LocalDate.of(2025, 8, 29)); // 14 jours → 6
        assertThat(matchingEngine.temporalProximity(lostPhone, foundPhone)).isEqualTo(6);

        foundPhone.setDateFound(LocalDate.of(2025, 10, 20)); // > 30 jours → 0
        assertThat(matchingEngine.temporalProximity(lostPhone, foundPhone)).isZero();
    }

    // ─── RUN MATCHING ────────────────────────────────────────────────

    @Test
    @DisplayName("runMatching — crée un match si score ≥ 80 (seuil CDC, paramétrable)")
    void runMatching_shouldCreateMatchWhenScoreHighEnough() {
        stubSettings();
        when(lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(lostPhone));
        when(foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(foundPhone));
        when(matchRepository.existsByLostObjectIdAndFoundObjectId(10L, 20L)).thenReturn(false);

        matchingEngine.runMatching();

        verify(matchRepository).save(argThat(match ->
                match.getMatchScore() >= 80 &&
                match.getScoreBreakdown() != null &&
                match.getScoreBreakdown().contains("category")
        ));
        verify(notificationService).createMatchNotification(
                eq(1L), any(), anyInt(), anyString(), anyString()
        );
    }

    @Test
    @DisplayName("runMatching — seuil paramétrable via PlatformSettings (match_min_score)")
    void runMatching_thresholdFromSettings() {
        when(platformSettingsService.getSettingAsInt("match_min_score")).thenReturn(95);
        when(lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(lostPhone));
        when(foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(foundPhone));
        when(matchRepository.existsByLostObjectIdAndFoundObjectId(10L, 20L)).thenReturn(false);

        matchingEngine.runMatching();

        // Score attendu < 95 → pas de match
        verify(matchRepository, never()).save(any());
    }

    @Test
    @DisplayName("runMatching — ne duplique pas un match existant")
    void runMatching_shouldNotDuplicateExistingMatch() {
        // existsMatch court-circuite avant tout calcul — aucun stub de settings nécessaire
        when(lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(lostPhone));
        when(foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(foundPhone));
        when(matchRepository.existsByLostObjectIdAndFoundObjectId(10L, 20L)).thenReturn(true);

        matchingEngine.runMatching();

        verify(matchRepository, never()).save(any());
    }

    @Test
    @DisplayName("runMatching — gère une liste vide d'objets")
    void runMatching_shouldHandleEmptyLists() {
        when(lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(Collections.emptyList());

        matchingEngine.runMatching();

        verify(matchRepository, never()).save(any());
    }

    // ─── MATCH FOR OBJECT ────────────────────────────────────────────

    @Test
    @DisplayName("matchForObject — objet inexistant : aucun calcul")
    void matchForObject_shouldDoNothingWhenNotFound() {
        when(lostObjectRepository.findById(999L)).thenReturn(java.util.Optional.empty());

        matchingEngine.matchForObject(999L);

        verify(matchRepository, never()).save(any());
    }

    @Test
    @DisplayName("matchForFoundObject — recalcule dans le sens found → lost")
    void matchForFoundObject_shouldCreateMatch() {
        stubSettings();
        when(foundObjectRepository.findById(20L)).thenReturn(java.util.Optional.of(foundPhone));
        when(lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(lostPhone));
        when(matchRepository.existsByLostObjectIdAndFoundObjectId(10L, 20L)).thenReturn(false);

        int created = matchingEngine.matchForFoundObject(20L);

        assertThat(created).isEqualTo(1);
        verify(matchRepository).save(argThat(match ->
                match.getUser().getId().equals(1L) // le match appartient au chercheur
        ));
    }

    @Test
    @DisplayName("matchForObject — catégorie différente : aucun match créé")
    void matchForObject_differentCategory_noMatch() {
        stubSettings();
        foundPhone.setCategory("Vêtements");
        when(lostObjectRepository.findById(10L)).thenReturn(java.util.Optional.of(lostPhone));
        when(foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE))
                .thenReturn(List.of(foundPhone));

        int created = matchingEngine.matchForObject(10L);

        assertThat(created).isZero();
        verify(matchRepository, never()).save(any());
    }
}
