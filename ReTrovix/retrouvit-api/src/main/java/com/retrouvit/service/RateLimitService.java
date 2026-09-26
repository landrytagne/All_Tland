package com.retrouvit.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Rate limiting en mémoire — audit M1.
 *
 * Compteur glissant par clé (IP + route) : N requêtes max par fenêtre.
 * Aucune dépendance externe (Redis absent de la stack, décision assumée) ;
 * suffisant pour une instance, à remplacer par un bucket distribué
 * (Redis) lors du passage multi-instances.
 *
 * La carte est bornée : les clés inactives sont purgées à chaque
 * vérification au-delà d'un seuil, pour éviter l'épuisement mémoire
 * via des IPs forgées (X-Forwarded-For spoofing des réseaux publics).
 */
@Service
public class RateLimitService {

    /** Nombre max d'entrées avant purge des clés expirées. */
    static final int MAX_ENTRIES = 50_000;

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    /** Débits par route protégée (fenêtre en secondes, requêtes max). */
    public record Limit(int maxRequests, int windowSeconds) {}

    /**
     * Tente de consommer une requête pour la clé donnée.
     * @return true si autorisé, false si la limite est atteinte (HTTP 429).
     */
    public boolean tryAcquire(String key, Limit limit) {
        long now = System.currentTimeMillis();
        long windowMs = limit.windowSeconds() * 1000L;

        if (windows.size() > MAX_ENTRIES) {
            windows.entrySet().removeIf(e -> e.getValue().expiresAt() < now);
        }

        Window window = windows.compute(key, (k, existing) -> {
            if (existing == null || existing.expiresAt() < now) {
                return new Window(now + windowMs, new AtomicInteger(1));
            }
            existing.count().incrementAndGet();
            return existing;
        });
        return window.count().get() <= limit.maxRequests();
    }

    /** Échelonné : renvoie les secondes restantes avant nouvelle tentative (approx.). */
    public long retryAfterSeconds(String key) {
        Window w = windows.get(key);
        if (w == null) return 0;
        return Math.max(1, (w.expiresAt() - System.currentTimeMillis()) / 1000);
    }

    /** Réinitialise la limite d'une clé (utile en test et après succès légitime). */
    public void reset(String key) {
        windows.remove(key);
    }

    /** Fenêtre active pour une clé. */
    private record Window(long expiresAt, AtomicInteger count) {}

    /** Débit d'authentification : 10 requêtes / minute par IP+route. */
    public static Limit authLimit() {
        return new Limit(10, 60);
    }

    /** Débit OTP : 5 requêtes / minute par IP (envoi d'emails = coûteux). */
    public static Limit otpLimit() {
        return new Limit(5, 60);
    }
}
