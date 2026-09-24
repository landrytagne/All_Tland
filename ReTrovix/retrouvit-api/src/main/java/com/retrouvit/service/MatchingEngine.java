package com.retrouvit.service;

import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Moteur de correspondance conforme au cahier des charges §7 :
 * - catégorie éliminatoire (score = 0 si différente) ;
 * - similarité texte 35 %, proximité géographique 20 %,
 *   proximité temporelle 15 %, similarité visuelle 30 % ;
 * - score ≥ 80 % (paramétrable match_min_score) → Match créé
 *   + notification au chercheur ;
 * - score ≥ 90 % (match_strong_score) → badge « correspondance forte » ;
 * - scoreBreakdown JSON détaillé par critère ;
 * - recalcul à chaque création/modification de publication.
 *
 * Note (CDC §14.2 — point ouvert) : la similarité visuelle réelle par
 * embeddings image attend le choix du fournisseur. En attendant, deux
 * photos identiques (même fichier) valent 30/30, sinon 0/30 ; quand
 * l'un des posts n'a pas de photo, les poids restants sont renormalisés
 * sur 100 pour ne pas pénaliser le score.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingEngine {

    static final int WEIGHT_TEXT = 35;
    static final int WEIGHT_GEO = 20;
    static final int WEIGHT_TEMPORAL = 15;
    static final int WEIGHT_VISUAL = 30;

    static final String SETTING_MIN_SCORE = "match_min_score";
    static final String SETTING_STRONG_SCORE = "match_strong_score";

    private final LostObjectRepository lostObjectRepository;
    private final FoundObjectRepository foundObjectRepository;
    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final PlatformSettingsService platformSettingsService;
    private final ObjectMapper objectMapper;

    /** Planifié toutes les 5 minutes (filet de sécurité + nouveaux objets). */
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void runMatching() {
        List<LostObject> activeLost = lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE);
        int newMatches = 0;
        for (LostObject lost : activeLost) {
            newMatches += matchForLost(lost);
        }
        if (newMatches > 0) {
            log.info("Matching planifié : {} nouveaux matches", newMatches);
        }
    }

    /** Recalcul pour un objet perdu (création/modification — CDC §7.2). */
    @Transactional
    public int matchForObject(Long lostObjectId) {
        LostObject lost = lostObjectRepository.findById(lostObjectId).orElse(null);
        if (lost == null) return 0;
        return matchForLost(lost);
    }

    /**
     * Recalcul dans l'autre sens : un objet trouvé publié compare
     * l'ensemble des objets perdus actifs — les matches appartiennent
     * au chercheur (propriétaire du post LOST), seul destinataire des
     * notifications de correspondance.
     */
    @Transactional
    public int matchForFoundObject(Long foundObjectId) {
        FoundObject found = foundObjectRepository.findById(foundObjectId).orElse(null);
        if (found == null) return 0;

        int created = 0;
        List<LostObject> activeLost = lostObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE);
        for (LostObject lost : activeLost) {
            if (existsMatch(lost.getId(), found.getId())) continue;
            if (createMatchIfAboveThreshold(lost, found)) created++;
        }
        return created;
    }

    private int matchForLost(LostObject lost) {
        int created = 0;
        List<FoundObject> activeFound = foundObjectRepository.findByStatusOrderByCreatedAtDesc(ObjectStatus.ACTIVE);
        for (FoundObject found : activeFound) {
            if (existsMatch(lost.getId(), found.getId())) continue;
            if (createMatchIfAboveThreshold(lost, found)) created++;
        }
        return created;
    }

    private boolean existsMatch(Long lostId, Long foundId) {
        return matchRepository.existsByLostObjectIdAndFoundObjectId(lostId, foundId);
    }

    private boolean createMatchIfAboveThreshold(LostObject lost, FoundObject found) {
        MatchResult result = calculateMatchScore(lost, found);
        int threshold = safeSetting(SETTING_MIN_SCORE, 80);
        if (result.score < threshold) return false;

        Match match = Match.builder()
                .lostObject(lost)
                .foundObject(found)
                .matchScore(result.score)
                .scoreBreakdown(result.breakdownJson)
                .user(lost.getUser())
                .build();
        matchRepository.save(match);

        notificationService.createMatchNotification(
                lost.getUser().getId(), match.getId(), result.score,
                lost.getTitle(), found.getTitle());

        User searcher = lost.getUser();
        searcher.setMatches(searcher.getMatches() + 1);
        userRepository.save(searcher);
        return true;
    }

    /** Score brut normalisé sur 100 + breakdown JSON (CDC §4.3 / §7.1). */
    MatchResult calculateMatchScore(LostObject lost, FoundObject found) {
        Map<String, Object> breakdown = new LinkedHashMap<>();

        // Catégorie : éliminatoire (CDC §7.1)
        boolean categoryMatch = lost.getCategory() != null
                && lost.getCategory().equalsIgnoreCase(found.getCategory());
        breakdown.put("category", categoryMatch ? 1 : 0);
        if (!categoryMatch) {
            return new MatchResult(0, toJson(breakdown));
        }

        int textScore = textSimilarity(lost, found);
        int geoScore = geoProximity(lost, found);
        int temporalScore = temporalProximity(lost, found);
        boolean bothHavePhotos = hasPhotos(lost) && hasPhotos(found);
        int visualScore = bothHavePhotos ? visualSimilarity(lost, found) : 0;

        int maxRaw = bothHavePhotos
                ? WEIGHT_TEXT + WEIGHT_GEO + WEIGHT_TEMPORAL + WEIGHT_VISUAL
                : WEIGHT_TEXT + WEIGHT_GEO + WEIGHT_TEMPORAL; // renormalisation sans photos

        breakdown.put("text", textScore);
        breakdown.put("geography", geoScore);
        breakdown.put("temporal", temporalScore);
        breakdown.put("visual", visualScore);
        breakdown.put("maxRaw", maxRaw);

        int raw = textScore + geoScore + temporalScore + visualScore;
        int score = (int) Math.round(raw * 100.0 / maxRaw);
        return new MatchResult(Math.min(100, score), toJson(breakdown));
    }

    /** Similarité texte (35 pts) : recouvrement lexical des mots significatifs. */
    int textSimilarity(LostObject lost, FoundObject found) {
        Set<String> lostWords = significantWords(lost.getTitle() + " " + lost.getDescription());
        Set<String> foundWords = significantWords(found.getTitle() + " " + found.getDescription());
        if (lostWords.isEmpty() || foundWords.isEmpty()) return 0;

        Set<String> smaller = lostWords.size() <= foundWords.size() ? lostWords : foundWords;
        Set<String> larger = smaller == lostWords ? foundWords : lostWords;

        long common = smaller.stream().filter(larger::contains).count();
        double ratio = (double) common / smaller.size();
        return (int) Math.round(ratio * WEIGHT_TEXT);
    }

    /** Proximité géographique (20 pts) : même ville (coordonnées GPS à venir). */
    int geoProximity(LostObject lost, FoundObject found) {
        return lost.getCity() != null && lost.getCity().equalsIgnoreCase(found.getCity())
                ? WEIGHT_GEO : 0;
    }

    /** Proximité temporelle (15 pts) : écart en jours entre perte et découverte. */
    int temporalProximity(LostObject lost, FoundObject found) {
        if (lost.getDateLost() == null || found.getDateFound() == null) return 0;
        long days = Math.abs(ChronoUnit.DAYS.between(lost.getDateLost(), found.getDateFound()));
        if (days <= 3) return WEIGHT_TEMPORAL;
        if (days <= 7) return 10;
        if (days <= 14) return 6;
        if (days <= 30) return 3;
        return 0;
    }

    /** Similarité visuelle (30 pts) — en attente d'embeddings (CDC §14.2). */
    int visualSimilarity(LostObject lost, FoundObject found) {
        Set<String> lostImages = imageUrls(lost);
        Set<String> foundImages = imageUrls(found);
        if (lostImages.isEmpty() || foundImages.isEmpty()) return 0;
        // Même fichier photo → même objet photographié
        return lostImages.stream().anyMatch(foundImages::contains) ? WEIGHT_VISUAL : 0;
    }

    private Set<String> significantWords(String text) {
        if (text == null) return Collections.emptySet();
        Set<String> words = new HashSet<>();
        for (String w : text.toLowerCase().split("[^a-zà-ÿ0-9]+")) {
            if (w.length() > 3) words.add(w);
        }
        return words;
    }

    private boolean hasPhotos(LostObject o) {
        return !imageUrls(o).isEmpty();
    }

    private boolean hasPhotos(FoundObject o) {
        return !imageUrls(o).isEmpty();
    }

    /** Union de image (simple) et images (JSON array). */
    private Set<String> imageUrls(LostObject o) {
        Set<String> urls = new HashSet<>();
        if (o.getImage() != null && !o.getImage().isBlank()) urls.add(o.getImage());
        urls.addAll(parseJsonArray(o.getImages()));
        return urls;
    }

    private Set<String> imageUrls(FoundObject o) {
        Set<String> urls = new HashSet<>();
        if (o.getImage() != null && !o.getImage().isBlank()) urls.add(o.getImage());
        urls.addAll(parseJsonArray(o.getImages()));
        return urls;
    }

    private Set<String> parseJsonArray(String json) {
        if (json == null || json.isBlank()) return Collections.emptySet();
        try {
            String[] arr = objectMapper.readValue(json, String[].class);
            return new HashSet<>(Arrays.asList(arr));
        } catch (Exception e) {
            return Collections.emptySet();
        }
    }

    private int safeSetting(String key, int fallback) {
        try {
            int v = platformSettingsService.getSettingAsInt(key);
            return v > 0 ? v : fallback;
        } catch (Exception e) {
            return fallback;
        }
    }

    private String toJson(Map<String, Object> breakdown) {
        try {
            return objectMapper.writeValueAsString(breakdown);
        } catch (Exception e) {
            return "{}";
        }
    }

    record MatchResult(int score, String breakdownJson) {}
}
