package com.retrouvit.service;

import com.retrouvit.dto.LocationShareResponse;
import com.retrouvit.dto.UserResponse;
import com.retrouvit.entity.CollaborationLocation;
import com.retrouvit.entity.ReturnRequest;
import com.retrouvit.entity.ReturnStatus;
import com.retrouvit.entity.Role;
import com.retrouvit.entity.User;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.CollaborationEventRepository;
import com.retrouvit.repository.CollaborationLocationRepository;
import com.retrouvit.repository.ReturnRequestRepository;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Partage de position pendant la mission — §13 / §20.
 *
 * Fenêtre de confidentialité :
 * <pre>
 * Avant mission          → Position masquée
 * Mission démarrée       → Position temporairement disponible
 * Restitution terminée   → Partage automatiquement désactivé (§20)
 * </pre>
 * Le partage n'est actif qu'entre MISSION_STARTED (inclus) et la fin de la
 * collaboration (COMPLETED / REFUNDED / ...). Toute autre tentative est refusée.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LocationSharingService {

    private final ReturnRequestRepository returnRequestRepository;
    private final CollaborationLocationRepository locationRepository;
    private final CollaborationEventRepository eventRepository;
    private final UserRepository userRepository;

    /** Statuts pendant lesquels le partage de position est actif (§13). */
    static boolean isSharingWindow(ReturnStatus status) {
        return status == ReturnStatus.MISSION_STARTED
                || status == ReturnStatus.MEETING_IN_PROGRESS
                || status == ReturnStatus.HANDOVER_PENDING;
    }

    /**
     * Enregistre (upsert) la position de l'utilisateur courant.
     * Un seul enregistrement par (collaboration, utilisateur), mis à jour à
     * chaque ping. Uniquement pendant la mission (§13).
     */
    @Transactional
    public LocationShareResponse updateMyLocation(Long requestId, Long userId,
                                                  Double latitude, Double longitude,
                                                  Double accuracyMeters) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));

        requireParty(request, userId);
        if (latitude == null || longitude == null
                || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("Coordonnées GPS invalides");
        }
        if (!isSharingWindow(request.getStatus())) {
            throw new IllegalArgumentException(
                    "Le partage de position n'est actif que pendant la mission (statut actuel: "
                            + request.getStatus() + ")");
        }

        CollaborationLocation location = locationRepository
                .findByReturnRequestIdAndUserId(requestId, userId)
                .orElseGet(() -> CollaborationLocation.builder()
                        .returnRequest(request)
                        .user(userRepository.getReferenceById(userId))
                        .build());

        location.setLatitude(latitude);
        location.setLongitude(longitude);
        if (accuracyMeters != null && accuracyMeters >= 0) {
            location.setAccuracyMeters(accuracyMeters);
        }
        locationRepository.save(location);

        return toResponse(request, userId, location, true);
    }

    /**
     * Position de l'autre partie (§13 : « Position mise à jour il y a
     * quelques secondes »). L'admin peut consulter dans le cadre du §24.
     * Renvoie toujours une réponse : {@code sharingActive=false} si masquée.
     */
    @Transactional(readOnly = true)
    public LocationShareResponse getPeerLocation(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));
        requirePartyOrAdmin(request, userId);

        Long peerId = request.getLoser().getId().equals(userId)
                ? request.getFinder().getId() : request.getLoser().getId();
        boolean sharingActive = isSharingWindow(request.getStatus());

        CollaborationLocation location = sharingActive
                ? locationRepository.findByReturnRequestIdAndUserId(requestId, peerId).orElse(null)
                : null;

        return toResponse(request, peerId, location, sharingActive);
    }

    /**
     * Ma propre dernière position connue (utile pour reprendre la page).
     * Mêmes règles de fenêtre que le peer.
     */
    @Transactional(readOnly = true)
    public LocationShareResponse getMyLocation(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaboration non trouvée"));
        requirePartyOrAdmin(request, userId);

        boolean sharingActive = isSharingWindow(request.getStatus());
        CollaborationLocation location = sharingActive
                ? locationRepository.findByReturnRequestIdAndUserId(requestId, userId).orElse(null)
                : null;

        return toResponse(request, userId, location, sharingActive);
    }

    /**
     * §20 : purge AUTOMATIQUE du partage de position à la fin de la
     * collaboration. Appelé par ReturnRequestService après la libération
     * des fonds (double confirmation) et après remboursement.
     */
    @Transactional
    public void endLocationSharing(ReturnRequest request, String reason) {
        try {
            locationRepository.deleteAllByReturnRequestId(request.getId());
            eventRepository.save(com.retrouvit.entity.CollaborationEvent.builder()
                    .returnRequest(request)
                    .actor(null)
                    .eventType("LOCATION_SHARING_ENDED")
                    .description(reason)
                    .build());
            log.info("Partage de position terminé pour {}", request.getReference());
        } catch (Exception e) {
            log.error("Impossible de purger le partage de position de {}: {}",
                    request.getReference(), e.getMessage());
        }
    }

    // ─── Garde-fous ───────────────────────────────────────────

    private void requireParty(ReturnRequest request, Long userId) {
        if (!request.getLoser().getId().equals(userId)
                && !request.getFinder().getId().equals(userId)) {
            throw new IllegalArgumentException("Vous n'êtes pas partie à cette restitution");
        }
    }

    private void requirePartyOrAdmin(ReturnRequest request, Long userId) {
        if (request.getLoser().getId().equals(userId)
                || request.getFinder().getId().equals(userId)) {
            return;
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        if (user.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Vous n'êtes pas partie à cette restitution");
        }
    }

    // ─── Mapper ───────────────────────────────────────────────

    private LocationShareResponse toResponse(ReturnRequest request, Long subjectUserId,
                                             CollaborationLocation location, boolean sharingActive) {
        User subject = userRepository.findById(subjectUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        return LocationShareResponse.builder()
                .returnRequestId(request.getId())
                .user(toUserResponse(subject))
                .latitude(location != null ? location.getLatitude() : null)
                .longitude(location != null ? location.getLongitude() : null)
                .accuracyMeters(location != null ? location.getAccuracyMeters() : null)
                .updatedAt(location != null ? location.getUpdatedAt() : null)
                .sharingActive(sharingActive)
                .build();
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .avatar(user.getAvatar())
                .trustScore(user.getTrustScore())
                .verified(user.getVerified())
                .build();
    }
}
