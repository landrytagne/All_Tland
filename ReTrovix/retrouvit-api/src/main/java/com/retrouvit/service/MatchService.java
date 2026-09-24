package com.retrouvit.service;

import com.retrouvit.dto.FoundObjectResponse;
import com.retrouvit.dto.LostObjectResponse;
import com.retrouvit.dto.MatchResponse;
import com.retrouvit.dto.UserResponse;
import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.MatchRepository;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final com.retrouvit.service.PlatformSettingsService platformSettingsService;

    /**
     * Badge « correspondance forte » : score ≥ seuil paramétrable
     * match_strong_score (défaut 90, CDC §7.2). Affiché en priorité
     * dans l'onglet correspondances côté client.
     */
    private boolean isStrongMatch(Integer score) {
        try {
            int strong = platformSettingsService.getSettingAsInt("match_strong_score");
            if (strong <= 0) strong = 90;
            return score != null && score >= strong;
        } catch (Exception e) {
            return score != null && score >= 90;
        }
    }

    public List<MatchResponse> getMatchesByUserId(Long userId) {
        return matchRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<MatchResponse> getMatchesByUserIdAndStatus(Long userId, MatchStatus status) {
        return matchRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, status).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public MatchResponse updateStatus(Long matchId, MatchStatus newStatus, Long userId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match non trouvé"));

        if (!match.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Vous ne pouvez modifier que vos propres matches");
        }

        match.setStatus(newStatus);
        Match updated = matchRepository.save(match);
        return toResponse(updated);
    }

    private MatchResponse toResponse(Match match) {
        LostObject lo = match.getLostObject();
        FoundObject fo = match.getFoundObject();

        UserResponse loUser = toUserResponse(lo.getUser());
        UserResponse foUser = toUserResponse(fo.getUser());

        LostObjectResponse loResponse = LostObjectResponse.builder()
                .id(lo.getId())
                .title(lo.getTitle())
                .description(lo.getDescription())
                .category(lo.getCategory())
                .location(lo.getLocation())
                .city(lo.getCity())
                .dateLost(lo.getDateLost())
                .status(lo.getStatus().name())
                .reward(lo.getReward())
                .views(lo.getViews())
                .user(loUser)
                .createdAt(lo.getCreatedAt())
                .build();

        FoundObjectResponse foResponse = FoundObjectResponse.builder()
                .id(fo.getId())
                .title(fo.getTitle())
                .description(fo.getDescription())
                .category(fo.getCategory())
                .location(fo.getLocation())
                .city(fo.getCity())
                .dateFound(fo.getDateFound())
                .status(fo.getStatus().name())
                .views(fo.getViews())
                .user(foUser)
                .createdAt(fo.getCreatedAt())
                .build();

        return MatchResponse.builder()
                .id(match.getId())
                .lostObject(loResponse)
                .foundObject(foResponse)
                .matchScore(match.getMatchScore())
                .scoreBreakdown(match.getScoreBreakdown())
                .strongMatch(isStrongMatch(match.getMatchScore()))
                .status(match.getStatus().name())
                .user(toUserResponse(match.getUser()))
                .createdAt(match.getCreatedAt())
                .build();
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .trustScore(user.getTrustScore())
                .verified(user.getVerified())
                .build();
    }
}
