package com.retrouvit.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

@DisplayName("AntiCircumventionService — Détection de contournement")
class AntiCircumventionServiceTest {

    private AntiCircumventionService service;

    @BeforeEach
    void setUp() {
        service = new AntiCircumventionService();
    }

    // ═══════════════════════════════════════════════════════════
    // Messages propres
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("Message propre non bloqué")
    void cleanMessage_notBlocked() {
        var result = service.analyze("J'ai bien trouvé votre téléphone near the coffee shop");
        assertThat(result.isBlocked()).isFalse();
    }

    @Test
    @DisplayName("Message vide non bloqué")
    void emptyMessage_notBlocked() {
        var result = service.analyze("");
        assertThat(result.isBlocked()).isFalse();
    }

    @Test
    @DisplayName("Message null non bloqué")
    void nullMessage_notBlocked() {
        var result = service.analyze(null);
        assertThat(result.isBlocked()).isFalse();
    }

    // ═══════════════════════════════════════════════════════════
    // Numéros de téléphone
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("Numéro international détecté")
    void phoneNumber_international() {
        var result = service.analyze("Appelez-moi au +237 699 123 456");
        assertThat(result.isBlocked()).isTrue();
        assertThat(result.isHasPhone()).isTrue();
    }

    @Test
    @DisplayName("Numéro local détecté")
    void phoneNumber_local() {
        var result = service.analyze("Mon numéro : 699 123 456");
        assertThat(result.isBlocked()).isTrue();
        assertThat(result.isHasPhone()).isTrue();
    }

    // ═══════════════════════════════════════════════════════════
    // Adresses email
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("Adresse email détectée")
    void emailAddress() {
        var result = service.analyze("Envoyez-moi un email à jean@gmail.com");
        assertThat(result.isBlocked()).isTrue();
        assertThat(result.isHasEmail()).isTrue();
    }

    // ═══════════════════════════════════════════════════════════
    // Liens externes
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("URL détectée")
    void url() {
        var result = service.analyze("Regardez sur https://example.com");
        assertThat(result.isBlocked()).isTrue();
        assertThat(result.isHasUrl()).isTrue();
    }

    @Test
    @DisplayName("Domaine .com détecté")
    void domain() {
        var result = service.analyze("Visitez mon site example.com");
        assertThat(result.isBlocked()).isTrue();
        assertThat(result.isHasUrl()).isTrue();
    }

    // ═══════════════════════════════════════════════════════════
    // Applications de messagerie
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("WhatsApp détecté")
    void whatsapp() {
        var result = service.analyze("Ajoutez-moi sur WhatsApp");
        assertThat(result.isBlocked()).isTrue();
        assertThat(result.isHasMessenger()).isTrue();
    }

    @Test
    @DisplayName("Telegram détecté")
    void telegram() {
        var result = service.analyze("Contactez-moi sur Telegram");
        assertThat(result.isBlocked()).isTrue();
        assertThat(result.isHasMessenger()).isTrue();
    }

    // ═══════════════════════════════════════════════════════════
    // Réseaux sociaux
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("Facebook détecté")
    void facebook() {
        var result = service.analyze("Suivez-moi sur facebook.com/monprofil");
        assertThat(result.isBlocked()).isTrue();
        assertThat(result.isHasSocialMedia()).isTrue();
    }

    @Test
    @DisplayName("Instagram détecté")
    void instagram() {
        var result = service.analyze("Mon insta : instagram.com/moncompte");
        assertThat(result.isBlocked()).isTrue();
        assertThat(result.isHasSocialMedia()).isTrue();
    }

    // ═══════════════════════════════════════════════════════════
    // Raison détaillée
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("Raison contient les détails")
    void reason_containsDetails() {
        var result = service.analyze("Call me at +237699123456 or email test@example.com");
        assertThat(result.isBlocked()).isTrue();
        assertThat(result.getReason()).contains("téléphone");
        assertThat(result.getReason()).contains("email");
    }
}
