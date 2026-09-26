package com.retrouvit.service;

import com.retrouvit.dto.LocationShareResponse;
import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.CollaborationEventRepository;
import com.retrouvit.repository.CollaborationLocationRepository;
import com.retrouvit.repository.ReturnRequestRepository;
import com.retrouvit.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Partage de position — §13/§20 :
 * - fenêtre de confidentialité : MISSION_STARTED → HANDOVER_PENDING uniquement ;
 * - position masquée (sharingActive=false) hors fenêtre ;
 * - purge automatique à la fin de la collaboration.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("LocationSharingService — Partage de position §13/§20")
class LocationSharingServiceTest {

    @Mock
    private ReturnRequestRepository returnRequestRepository;
    @Mock
    private CollaborationLocationRepository locationRepository;
    @Mock
    private CollaborationEventRepository eventRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private LocationSharingService locationSharingService;

    private ReturnRequest request;
    private User loser;
    private User finder;

    @BeforeEach
    void setUp() {
        loser = User.builder().id(1L).name("Jean").email("jean@test.com")
                .role(Role.USER).trustScore(50).build();
        finder = User.builder().id(2L).name("Paul").email("paul@test.com")
                .role(Role.USER).trustScore(50).build();

        request = ReturnRequest.builder()
                .id(10L)
                .reference("RET-TEST0001")
                .loser(loser)
                .finder(finder)
                .status(ReturnStatus.MISSION_STARTED)
                .build();

        when(returnRequestRepository.findById(10L)).thenReturn(Optional.of(request));
        when(userRepository.findById(anyLong())).thenAnswer(inv ->
                Optional.of(inv.getArgument(0).equals(1L) ? loser : finder));
        when(userRepository.getReferenceById(anyLong())).thenAnswer(inv ->
                inv.getArgument(0).equals(1L) ? loser : finder);
        when(locationRepository.findByReturnRequestIdAndUserId(anyLong(), anyLong()))
                .thenReturn(Optional.empty());
        when(locationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Nested
    @DisplayName("Fenêtre de confidentialité (§13)")
    class SharingWindow {

        @Test
        @DisplayName("Position enregistrée pendant la mission (MISSION_STARTED)")
        void updateDuringMission_ok() {
            LocationShareResponse response = locationSharingService.updateMyLocation(
                    10L, 2L, 4.05, 9.70, 15.0);

            assertThat(response.isSharingActive()).isTrue();
            assertThat(response.getLatitude()).isEqualTo(4.05);
            assertThat(response.getLongitude()).isEqualTo(9.70);
            verify(locationRepository).save(any(CollaborationLocation.class));
        }

        @Test
        @DisplayName("Refus avant mission (ESCROW_FUNDED) — position masquée")
        void updateBeforeMission_refused() {
            request.setStatus(ReturnStatus.ESCROW_FUNDED);

            assertThatThrownBy(() -> locationSharingService.updateMyLocation(
                    10L, 2L, 4.05, 9.70, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("partage de position n'est actif que pendant la mission");
            verify(locationRepository, never()).save(any());
        }

        @Test
        @DisplayName("Refus après restitution (COMPLETED)")
        void updateAfterCompletion_refused() {
            request.setStatus(ReturnStatus.COMPLETED);

            assertThatThrownBy(() -> locationSharingService.updateMyLocation(
                    10L, 2L, 4.05, 9.70, null))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("Peer : position visible pendant la mission")
        void peerDuringMission_visible() {
            CollaborationLocation loc = CollaborationLocation.builder()
                    .latitude(4.06).longitude(9.71).build();
            when(locationRepository.findByReturnRequestIdAndUserId(10L, 1L))
                    .thenReturn(Optional.of(loc));

            LocationShareResponse response = locationSharingService.getPeerLocation(10L, 2L);

            assertThat(response.isSharingActive()).isTrue();
            assertThat(response.getLatitude()).isEqualTo(4.06);
            assertThat(response.getUser().getId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("Peer : position masquée après COMPLETED (§20)")
        void peerAfterCompletion_masked() {
            request.setStatus(ReturnStatus.COMPLETED);

            LocationShareResponse response = locationSharingService.getPeerLocation(10L, 2L);

            assertThat(response.isSharingActive()).isFalse();
            assertThat(response.getLatitude()).isNull();
            verify(locationRepository, never()).findByReturnRequestIdAndUserId(anyLong(), anyLong());
        }

        @Test
        @DisplayName("Position absente : réponse vide mais sharingActive=true")
        void peerNoLocationYet() {
            LocationShareResponse response = locationSharingService.getPeerLocation(10L, 2L);

            assertThat(response.isSharingActive()).isTrue();
            assertThat(response.getLatitude()).isNull();
        }
    }

    @Nested
    @DisplayName("Garde-fous d'accès")
    class AccessControl {

        @Test
        @DisplayName("Un tiers ne peut ni partager ni consulter")
        void thirdParty_refused() {
            assertThatThrownBy(() -> locationSharingService.updateMyLocation(
                    10L, 99L, 4.05, 9.70, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("pas partie");
            assertThatThrownBy(() -> locationSharingService.getPeerLocation(10L, 99L))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("Un admin peut consulter la position (§24)")
        void adminCanRead() {
            User admin = User.builder().id(9L).name("Admin").role(Role.ADMIN).build();
            when(userRepository.findById(9L)).thenReturn(Optional.of(admin));

            LocationShareResponse response = locationSharingService.getPeerLocation(10L, 9L);

            assertThat(response).isNotNull();
        }

        @Test
        @DisplayName("Coordonnées invalides refusées")
        void invalidCoordinates_refused() {
            assertThatThrownBy(() -> locationSharingService.updateMyLocation(
                    10L, 2L, 95.0, 9.70, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Coordonnées GPS invalides");
        }

        @Test
        @DisplayName("Collaboration inexistante → 404")
        void unknownRequest_404() {
            when(returnRequestRepository.findById(404L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> locationSharingService.updateMyLocation(
                    404L, 2L, 4.05, 9.70, null))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Fin automatique du partage (§20)")
    class EndOfSharing {

        @Test
        @DisplayName("Purge des positions + événement d'audit")
        void endSharing_purgesAndLogs() {
            locationSharingService.endLocationSharing(request,
                    "Restitution confirmée — partage désactivé");

            verify(locationRepository).deleteAllByReturnRequestId(10L);
            verify(eventRepository).save(argThat(ev ->
                    "LOCATION_SHARING_ENDED".equals(ev.getEventType())));
        }

        @Test
        @DisplayName("La purge est silencieuse en cas d'erreur")
        void endSharing_neverThrows() {
            doThrow(new RuntimeException("DB down"))
                    .when(locationRepository).deleteAllByReturnRequestId(10L);

            assertThatCode(() -> locationSharingService.endLocationSharing(request, "test"))
                    .doesNotThrowAnyException();
        }
    }
}
