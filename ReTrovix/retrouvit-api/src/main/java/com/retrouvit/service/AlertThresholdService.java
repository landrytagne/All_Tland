package com.retrouvit.service;

import com.retrouvit.dto.AlertThresholdRequest;
import com.retrouvit.dto.AlertThresholdResponse;
import com.retrouvit.entity.AlertLevel;
import com.retrouvit.entity.AlertThreshold;
import com.retrouvit.repository.AlertThresholdRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertThresholdService {

    private final AlertThresholdRepository thresholdRepository;

    // ─── Default thresholds ────────────────────────────────────────

    private static final Map<String, Map<AlertLevel, Long>> DEFAULTS = Map.of(
        "PENDING_REPORTS", Map.of(
            AlertLevel.WARNING, 5L,
            AlertLevel.CRITICAL, 15L
        ),
        "ESCALATED_REPORTS", Map.of(
            AlertLevel.WARNING, 3L,
            AlertLevel.CRITICAL, 8L
        ),
        "BANNED_USERS", Map.of(
            AlertLevel.WARNING, 5L,
            AlertLevel.CRITICAL, 20L
        ),
        "LOW_ACTIVE_OBJECTS", Map.of(
            AlertLevel.WARNING, 3L
        ),
        "LOW_MATCH_RATE", Map.of(
            AlertLevel.WARNING, 1L
        ),
        "NO_NEW_USERS", Map.of(
            AlertLevel.WARNING, 1L
        )
    );

    private static final Map<String, String> DESCRIPTIONS = Map.of(
        "PENDING_REPORTS", "Signalements en attente de traitement",
        "ESCALATED_REPORTS", "Signalements escaladés nécessitant une action urgente",
        "BANNED_USERS", "Utilisateurs bannis sur la plateforme",
        "LOW_ACTIVE_OBJECTS", "Objets actifs — la plateforme manque de contenu",
        "LOW_MATCH_RATE", "Taux de match faible — le moteur peut nécessiter un ajustement",
        "NO_NEW_USERS", "Inscriptions aujourd'hui — la croissance est au point mort"
    );

    // ─── Initialize defaults on startup ────────────────────────────

    /**
     * Initialize default thresholds if none exist.
     */
    public void initDefaults() {
        if (thresholdRepository.count() > 0) return;

        List<AlertThreshold> defaults = new ArrayList<>();
        DEFAULTS.forEach((category, levels) -> {
            levels.forEach((level, value) -> {
                defaults.add(AlertThreshold.builder()
                        .category(category)
                        .level(level)
                        .value(value)
                        .enabled(true)
                        .description(DESCRIPTIONS.get(category))
                        .build());
            });
        });

        thresholdRepository.saveAll(defaults);
        log.info("Initialized {} default alert thresholds", defaults.size());
    }

    // ─── Public methods ────────────────────────────────────────────

    public List<AlertThresholdResponse> getAll() {
        return thresholdRepository.findAllByOrderByCategoryAscLevelAsc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<AlertThresholdResponse> getByCategory(String category) {
        return thresholdRepository.findByCategoryOrderByLevelAsc(category).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public AlertThresholdResponse update(Long id, AlertThresholdRequest request) {
        AlertThreshold threshold = thresholdRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Threshold not found: " + id));

        if (request.getValue() >= 0) {
            threshold.setValue(request.getValue());
        }
        if (request.getEnabled() != null) {
            threshold.setEnabled(request.getEnabled());
        }
        if (request.getDescription() != null) {
            threshold.setDescription(request.getDescription());
        }

        return toResponse(thresholdRepository.save(threshold));
    }

    public Map<String, Object> resetDefaults() {
        thresholdRepository.deleteAll();
        initDefaults();
        return Map.of("message", "Seuils réinitialisés aux valeurs par défaut", "count", thresholdRepository.count());
    }

    /**
     * Get threshold value for a specific category and level.
     * Falls back to hardcoded default if not in DB.
     */
    public long getThreshold(String category, AlertLevel level) {
        return thresholdRepository.findByCategoryAndLevel(category, level)
                .filter(AlertThreshold::isEnabled)
                .map(AlertThreshold::getValue)
                .orElseGet(() -> {
                    // Fallback to defaults
                    Map<AlertLevel, Long> catDefaults = DEFAULTS.get(category);
                    if (catDefaults != null && catDefaults.containsKey(level)) {
                        return catDefaults.get(level);
                    }
                    return Long.MAX_VALUE; // effectively disabled
                });
    }

    /**
     * Check if a threshold category+level is enabled.
     */
    public boolean isEnabled(String category, AlertLevel level) {
        return thresholdRepository.findByCategoryAndLevel(category, level)
                .map(AlertThreshold::isEnabled)
                .orElse(true); // default to enabled
    }

    /**
     * Get all active thresholds as a map for quick lookup.
     * Returns Map<"CATEGORY:WARNING", value> and Map<"CATEGORY:CRITICAL", value>.
     */
    public Map<String, Long> getActiveThresholds() {
        Map<String, Long> result = new HashMap<>();
        thresholdRepository.findByEnabledTrue().forEach(t -> {
            result.put(t.getCategory() + ":" + t.getLevel(), t.getValue());
        });
        return result;
    }

    // ─── DTO mapping ───────────────────────────────────────────────

    private AlertThresholdResponse toResponse(AlertThreshold t) {
        return AlertThresholdResponse.builder()
                .id(t.getId())
                .category(t.getCategory())
                .level(t.getLevel())
                .value(t.getValue())
                .enabled(t.isEnabled())
                .description(t.getDescription())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }
}
