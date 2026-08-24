package com.retrouvit.service;

import com.retrouvit.entity.*;
import com.retrouvit.repository.FoundObjectRepository;
import com.retrouvit.repository.LostObjectRepository;
import com.retrouvit.repository.MatchRepository;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingEngine {

    private final LostObjectRepository lostObjectRepository;
    private final FoundObjectRepository foundObjectRepository;
    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Scheduled task to run matching every 5 minutes
     */
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void runMatching() {
        log.info("Running matching engine...");

        List<LostObject> activeLost = lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE);
        List<FoundObject> activeFound = foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE);

        int newMatches = 0;

        for (LostObject lost : activeLost) {
            for (FoundObject found : activeFound) {
                // Skip if already matched
                if (matchRepository.findByUserIdOrderByCreatedAtDesc(lost.getUser().getId())
                        .stream()
                        .anyMatch(m -> m.getLostObject().getId().equals(lost.getId())
                                && m.getFoundObject().getId().equals(found.getId()))) {
                    continue;
                }

                int score = calculateMatchScore(lost, found);
                if (score >= 60) { // Only create matches with >= 60% score
                    Match match = Match.builder()
                            .lostObject(lost)
                            .foundObject(found)
                            .matchScore(score)
                            .user(lost.getUser())
                            .build();
                    matchRepository.save(match);
                    newMatches++;

                    // Notify user with WebSocket push
                    notificationService.createMatchNotification(
                            lost.getUser().getId(),
                            match.getId(),
                            score,
                            lost.getTitle(),
                            found.getTitle()
                    );

                    // Update user match count
                    User user = lost.getUser();
                    user.setMatches(user.getMatches() + 1);
                    userRepository.save(user);
                }
            }
        }

        log.info("Matching engine completed. Found {} new matches.", newMatches);
    }

    /**
     * Calculate match score between a lost and found object
     * Uses category, city, and text similarity
     */
    private int calculateMatchScore(LostObject lost, FoundObject found) {
        int score = 0;

        // Category match (40 points max)
        if (lost.getCategory().equalsIgnoreCase(found.getCategory())) {
            score += 40;
        }

        // City match (30 points max)
        if (lost.getCity().equalsIgnoreCase(found.getCity())) {
            score += 30;
        } else {
            // Different city, small chance
            score += 5;
        }

        // Title/description text similarity (30 points max)
        String lostText = (lost.getTitle() + " " + lost.getDescription()).toLowerCase();
        String foundText = (found.getTitle() + " " + found.getDescription()).toLowerCase();

        String[] lostWords = lostText.split("\\s+");
        int commonWords = 0;
        for (String word : lostWords) {
            if (word.length() > 3 && foundText.contains(word)) {
                commonWords++;
            }
        }
        double textScore = Math.min(30, (commonWords * 3.0));
        score += (int) textScore;

        return Math.min(100, score);
    }

    /**
     * Manually trigger matching for a specific lost object
     */
    @Transactional
    public void matchForObject(Long lostObjectId) {
        LostObject lost = lostObjectRepository.findById(lostObjectId).orElse(null);
        if (lost == null) return;

        List<FoundObject> activeFound = foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE);

        for (FoundObject found : activeFound) {
            int score = calculateMatchScore(lost, found);
            if (score >= 60) {
                boolean exists = matchRepository.findByUserIdOrderByCreatedAtDesc(lost.getUser().getId())
                        .stream()
                        .anyMatch(m -> m.getLostObject().getId().equals(lost.getId())
                                && m.getFoundObject().getId().equals(found.getId()));

                if (!exists) {
                    Match match = Match.builder()
                            .lostObject(lost)
                            .foundObject(found)
                            .matchScore(score)
                            .user(lost.getUser())
                            .build();
                    matchRepository.save(match);

                    notificationService.createMatchNotification(
                            lost.getUser().getId(),
                            match.getId(),
                            score,
                            lost.getTitle(),
                            found.getTitle()
                    );
                }
            }
        }
    }
}
