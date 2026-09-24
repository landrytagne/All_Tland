package com.retrouvit.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

/**
 * Service de détection de contournement.
 * Détecte les tentatives de partage de coordonnées personnelles dans les messages.
 */
@Service
@Slf4j
public class AntiCircumventionService {

    // ════════════════════════════════════════════════════════════
    // Patterns de détection
    // ════════════════════════════════════════════════════════════

    /** Numéros de téléphone internationaux et locaux */
    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(?i)" +
            "(?:\\+\\d{1,3}[\\s\\-.]?)?" +           // indicatif international
            "(?:\\(?\\d{2,4}\\)?[\\s\\-.]?)?" +       // code régional
            "\\d{2,4}[\\s\\-.]?\\d{2,4}[\\s\\-.]?\\d{2,4}" // numéro
    );

    /** Adresses email */
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "(?i)[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}"
    );

    /** Liens externes */
    private static final Pattern URL_PATTERN = Pattern.compile(
            "(?i)(https?://|www\\.|\\.com|\\.fr|\\.net|\\.org|\\.io|\\.co)"
    );

    /** Mots-clés WhatsApp/Telegram */
    private static final Pattern MESSENGER_KEYWORDS = Pattern.compile(
            "(?i)(whatsapp|telegram|whats\\s*app|t\\s*.me|wa\\.me|signal|viber|imo)"
    );

    /** Réseaux sociaux directs */
    private static final Pattern SOCIAL_MEDIA = Pattern.compile(
            "(?i)(facebook\\.com|fb\\.com|instagram\\.com|ig\\.com|twitter\\.com|x\\.com|tiktok\\.com)"
    );

    // ════════════════════════════════════════════════════════════
    // Analyse d'un message
    // ════════════════════════════════════════════════════════════

    public CircumventionResult analyze(String messageContent) {
        if (messageContent == null || messageContent.isBlank()) {
            return CircumventionResult.clean();
        }

        String normalized = messageContent.trim();

        boolean hasPhone = PHONE_PATTERN.matcher(normalized).find();
        boolean hasEmail = EMAIL_PATTERN.matcher(normalized).find();
        boolean hasUrl = URL_PATTERN.matcher(normalized).find();
        boolean hasMessenger = MESSENGER_KEYWORDS.matcher(normalized).find();
        boolean hasSocialMedia = SOCIAL_MEDIA.matcher(normalized).find();

        boolean isSuspicious = hasPhone || hasEmail || hasUrl || hasMessenger || hasSocialMedia;

        StringBuilder reason = new StringBuilder();
        if (hasPhone) reason.append("Numéro de téléphone détecté. ");
        if (hasEmail) reason.append("Adresse email détectée. ");
        if (hasUrl) reason.append("Lien externe détecté. ");
        if (hasMessenger) reason.append("Application de messagerie détectée. ");
        if (hasSocialMedia) reason.append("Réseau social détecté. ");

        return CircumventionResult.builder()
                .blocked(isSuspicious)
                .hasPhone(hasPhone)
                .hasEmail(hasEmail)
                .hasUrl(hasUrl)
                .hasMessenger(hasMessenger)
                .hasSocialMedia(hasSocialMedia)
                .reason(reason.toString().trim())
                .build();
    }

    // ════════════════════════════════════════════════════════════
    // Data class
    // ════════════════════════════════════════════════════════════

    @lombok.Data
    @lombok.Builder
    public static class CircumventionResult {
        private boolean blocked;
        private boolean hasPhone;
        private boolean hasEmail;
        private boolean hasUrl;
        private boolean hasMessenger;
        private boolean hasSocialMedia;
        private String reason;

        public static CircumventionResult clean() {
            return CircumventionResult.builder()
                    .blocked(false)
                    .reason("")
                    .build();
        }
    }
}
