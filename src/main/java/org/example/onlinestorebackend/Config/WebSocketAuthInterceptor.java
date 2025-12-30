package org.example.onlinestorebackend.Config;

import org.example.onlinestorebackend.Service.UserDetailsServiceImpl;
import org.example.onlinestorebackend.Util.JwtUtil;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;

    public WebSocketAuthInterceptor(JwtUtil jwtUtil, UserDetailsServiceImpl userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            // Extract token from Authorization header
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    String username = jwtUtil.extractUsername(token);
                    if (username != null) {
                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                        if (jwtUtil.isTokenValid(token, userDetails)) {
                            UsernamePasswordAuthenticationToken auth = 
                                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                            accessor.setUser(auth);
                        }
                    }
                } catch (Exception e) {
                    // Invalid token - allow connection but without authentication
                    // Guest users can connect without token
                    System.out.println("WebSocket connection without valid token (guest user): " + e.getMessage());
                }
            }
            // If no token, allow connection (for guest users)
        }
        
        return message;
    }
}

