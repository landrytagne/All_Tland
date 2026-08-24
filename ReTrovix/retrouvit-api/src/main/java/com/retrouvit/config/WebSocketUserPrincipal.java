package com.retrouvit.config;

import com.retrouvit.entity.User;
import lombok.Getter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.security.Principal;
import java.util.List;

/**
 * Custom Principal that carries the full User entity through the WebSocket session.
 */
@Getter
public class WebSocketUserPrincipal implements Principal {

    private final Long userId;
    private final String name;
    private final String email;
    private final User user;

    public WebSocketUserPrincipal(User user) {
        this.userId = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.user = user;
    }

    @Override
    public String getName() {
        return name;
    }

    /**
     * Create a Spring Security Authentication object from this principal.
     */
    public UsernamePasswordAuthenticationToken toAuthentication() {
        List<SimpleGrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
        );
        return new UsernamePasswordAuthenticationToken(this, null, authorities);
    }
}
