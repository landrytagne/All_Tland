package com.retrouvit.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Client listens on /topic (broadcast) and /user/queue (private)
        config.enableSimpleBroker("/topic", "/user/queue");
        // Client sends to /app
        config.setApplicationDestinationPrefixes("/app");
        // User-specific destination prefix
        config.setUserDestinationPrefix("/user");
    }

    private List<String> getAllowedOrigins() {
        List<String> origins = new ArrayList<>(List.of(
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:8080",
                "https://retrouvit.com"
        ));

        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface ni = interfaces.nextElement();
                if (ni.isLoopback() || !ni.isUp()) continue;
                Enumeration<InetAddress> addresses = ni.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (addr.isLoopbackAddress() || !(addr instanceof java.net.Inet4Address)) continue;
                    String ip = addr.getHostAddress();
                    origins.add("http://" + ip + ":3000");
                    origins.add("http://" + ip + ":3001");
                }
            }
        } catch (Exception e) {
            // Fallback: WebSocket will still work for localhost
        }

        return origins;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins(getAllowedOrigins().toArray(new String[0]))
                .addInterceptors(jwtHandshakeInterceptor)
                .withSockJS();
    }
}
