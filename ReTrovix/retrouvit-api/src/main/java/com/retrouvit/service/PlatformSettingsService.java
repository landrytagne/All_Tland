package com.retrouvit.service;

import com.retrouvit.dto.PlatformSettingsResponse;
import com.retrouvit.entity.PlatformSettings;
import com.retrouvit.repository.PlatformSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlatformSettingsService {

    private final PlatformSettingsRepository settingsRepository;

    // Default settings
    private static final Map<String, String[]> DEFAULT_SETTINGS = new HashMap<>() {{
        put("site_name", new String[]{"RetrouvIt", "STRING", "Nom de la plateforme"});
        put("site_description", new String[]{"La plateforme camerounaise qui reconnecte les personnes avec leurs objets perdus.", "STRING", "Description du site"});
        put("support_email", new String[]{"support@retrouvit.com", "STRING", "Email de support"});
        put("maintenance_mode", new String[]{"false", "BOOLEAN", "Mode maintenance"});
        put("registration_enabled", new String[]{"true", "BOOLEAN", "Inscriptions activées"});
        put("email_notifications", new String[]{"true", "BOOLEAN", "Notifications email"});
        put("sms_notifications", new String[]{"false", "BOOLEAN", "Notifications SMS"});
        put("auto_match_enabled", new String[]{"true", "BOOLEAN", "Matching automatique"});
        put("max_upload_size_mb", new String[]{"5", "NUMBER", "Taille max upload (MB)"});
        put("default_language", new String[]{"fr", "STRING", "Langue par défaut"});
        put("min_trust_score_certification", new String[]{"40", "NUMBER", "Score min. certification"});
        put("platform_fee_percent", new String[]{"5", "NUMBER", "Frais plateforme (%)"});
        // Seuils de matching — paramétrables depuis le back-office (CDC §7.2/§14.2)
        put("match_min_score", new String[]{"80", "NUMBER", "Score minimum de correspondance (%)"});
        put("match_strong_score", new String[]{"90", "NUMBER", "Seuil du badge « correspondance forte » (%)"});
        put("withdraw_manual_review_min", new String[]{"100000", "NUMBER", "Seuil anti-fraude retrait XAF (validation finance)"});
    }};

    /**
     * Get all settings.
     */
    public List<PlatformSettingsResponse> getAllSettings() {
        return settingsRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a setting by key.
     */
    public PlatformSettingsResponse getSettingByKey(String key) {
        PlatformSettings setting = settingsRepository.findBySettingKey(key)
                .orElse(null);
        if (setting == null) {
            // Return default if exists
            String[] defaultVal = DEFAULT_SETTINGS.get(key);
            if (defaultVal != null) {
                return PlatformSettingsResponse.builder()
                        .settingKey(key)
                        .settingValue(defaultVal[0])
                        .settingType(defaultVal[1])
                        .description(defaultVal[2])
                        .build();
            }
            return null;
        }
        return toResponse(setting);
    }

    /**
     * Get a setting value as string.
     */
    public String getSettingValue(String key) {
        PlatformSettings setting = settingsRepository.findBySettingKey(key).orElse(null);
        if (setting != null) {
            return setting.getSettingValue();
        }
        String[] defaultVal = DEFAULT_SETTINGS.get(key);
        return defaultVal != null ? defaultVal[0] : null;
    }

    /**
     * Get a setting value as boolean.
     */
    public boolean getSettingAsBoolean(String key) {
        String value = getSettingValue(key);
        return Boolean.parseBoolean(value);
    }

    /**
     * Get a setting value as integer.
     */
    public int getSettingAsInt(String key) {
        String value = getSettingValue(key);
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /**
     * Update a setting.
     */
    @Transactional
    public PlatformSettingsResponse updateSetting(String key, String value) {
        PlatformSettings setting = settingsRepository.findBySettingKey(key).orElse(null);

        if (setting == null) {
            // Create new setting
            String[] defaultInfo = DEFAULT_SETTINGS.get(key);
            String type = "STRING";
            String description = "";
            if (defaultInfo != null) {
                type = defaultInfo[1];
                description = defaultInfo[2];
            }

            setting = PlatformSettings.builder()
                    .settingKey(key)
                    .settingValue(value)
                    .settingType(type)
                    .description(description)
                    .build();
        } else {
            setting.setSettingValue(value);
        }

        PlatformSettings saved = settingsRepository.save(setting);
        log.info("Setting updated: {} = {}", key, value);
        return toResponse(saved);
    }

    /**
     * Update multiple settings at once.
     */
    @Transactional
    public List<PlatformSettingsResponse> updateSettings(Map<String, String> settingsMap) {
        return settingsMap.entrySet().stream()
                .map(entry -> updateSetting(entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());
    }

    /**
     * Initialize default settings if they don't exist.
     */
    @Transactional
    public void initializeDefaults() {
        DEFAULT_SETTINGS.forEach((key, values) -> {
            if (!settingsRepository.existsBySettingKey(key)) {
                PlatformSettings setting = PlatformSettings.builder()
                        .settingKey(key)
                        .settingValue(values[0])
                        .settingType(values[1])
                        .description(values[2])
                        .build();
                settingsRepository.save(setting);
            }
        });
        log.info("Default settings initialized");
    }

    private PlatformSettingsResponse toResponse(PlatformSettings setting) {
        return PlatformSettingsResponse.builder()
                .id(setting.getId())
                .settingKey(setting.getSettingKey())
                .settingValue(setting.getSettingValue())
                .settingType(setting.getSettingType())
                .description(setting.getDescription())
                .updatedAt(setting.getUpdatedAt())
                .build();
    }
}
