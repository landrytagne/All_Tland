package com.retrouvit.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            // On CONNECT, extract principal from session attributes set during handshake
            Object principalObj = accessor.getSessionAttributes().get("principal");

            if (principalObj instanceof WebSocketUserPrincipal principal) {
                UsernamePasswordAuthenticationToken authentication = principal.toAuthentication();
                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("STOMP CONNECT authenticated: {}", principal.getName());
            }
        }

        return message;
    }
}
