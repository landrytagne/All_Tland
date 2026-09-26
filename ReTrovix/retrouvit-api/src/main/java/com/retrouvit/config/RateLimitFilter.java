package com.retrouvit.config;

import com.retrouvit.service.RateLimitService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

/**
 * Filtre de rate limiting — audit M1.
 *
 * Protège les endpoints publics sensibles du brute-force et du bombing :
 * - login / register / forgot-password : 10 req/min par IP+route ;
 * - OTP request/register : 5 req/min par IP (envoi d'emails coûteux).
 *
 * Répond 429 avec Retry-After au lieu de laisser passer.
 * Placé avant le filtre JWT (les routes sont publiques).
 */
@Component
@Order(1)
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;

    /** Route → débit applicables (préfixe de match). */
    private static final Map<String, RateLimitService.Limit> PROTECTED_ROUTES = Map.of(
            "/api/auth/login", RateLimitService.authLimit(),
            "/api/auth/refresh", RateLimitService.authLimit(),
            "/api/auth/forgot-password", RateLimitService.authLimit(),
            "/api/auth/reset-password", RateLimitService.authLimit(),
            "/api/users", RateLimitService.authLimit(),
            "/api/auth/otp/request", RateLimitService.otpLimit(),
            "/api/auth/otp/register", RateLimitService.otpLimit(),
            "/api/auth/otp/register/resend", RateLimitService.otpLimit()
    );

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        RateLimitService.Limit limit = matchRoute(path);

        if (limit != null && !"OPTIONS".equalsIgnoreCase(request.getMethod())) {
            String clientKey = clientIp(request) + ":" + path;
            if (!rateLimitService.tryAcquire(clientKey, limit)) {
                response.setStatus(429);
                response.setContentType("application/json");
                response.setHeader("Retry-After", String.valueOf(rateLimitService.retryAfterSeconds(clientKey)));
                response.getWriter().write(
                        "{\"error\":\"Trop de tentatives\",\"message\":\"Réessayez dans quelques instants\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private RateLimitService.Limit matchRoute(String path) {
        for (Map.Entry<String, RateLimitService.Limit> e : PROTECTED_ROUTES.entrySet()) {
            if (path.equals(e.getKey()) || path.startsWith(e.getKey() + "/")) {
                return e.getValue();
            }
        }
        return null;
    }

    /** IP réelle derrière le reverse proxy, ou IP directe. */
    private String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            // Premier hop = client d'origine
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
