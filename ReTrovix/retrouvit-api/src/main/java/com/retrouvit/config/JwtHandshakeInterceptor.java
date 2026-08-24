package com.retrouvit.config;

import com.retrouvit.service.JwtService;
import com.retrouvit.entity.User;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.util.StringUtils;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        try {
            String token = extractToken(request);

            if (token == null || !jwtService.isTokenValid(token)) {
                log.warn("WebSocket handshake rejected: invalid or missing token");
                return false;
            }

            String email = jwtService.extractEmail(token);
            User user = userRepository.findByEmail(email).orElse(null);

            if (user == null) {
                log.warn("WebSocket handshake rejected: user not found for email {}", email);
                return false;
            }

            // Create WebSocketUserPrincipal and store in session attributes
            WebSocketUserPrincipal principal = new WebSocketUserPrincipal(user);
            attributes.put("principal", principal);
            attributes.put("userId", user.getId());
            attributes.put("userName", user.getName());

            log.info("WebSocket handshake accepted for user: {} (id={})", user.getName(), user.getId());
            return true;

        } catch (Exception e) {
            log.error("WebSocket handshake error: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // No-op
    }

    private String extractToken(ServerHttpRequest request) {
        // Try query parameter first: ?token=xxx
        String query = request.getURI().getQuery();
        if (query != null) {
            for (String param : query.split("&")) {
                String[] kv = param.split("=");
                if (kv.length == 2 && "token".equals(kv[0])) {
                    return kv[1];
                }
            }
        }

        // Try Authorization header
        String authHeader = request.getHeaders().getFirst("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        return null;
    }
}
