package com.retrouvit.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/users").permitAll()
                        .requestMatchers("/swagger-ui/**", "/api-docs/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/ws").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Files - public read, authenticated upload
                        .requestMatchers(HttpMethod.GET, "/api/files/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/files/upload").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/files/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/users/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/users/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/users/**").authenticated()

                        // Objects - anyone can read, authenticated users can create
                        .requestMatchers(HttpMethod.GET, "/api/lost-objects/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/found-objects/**").permitAll()
                        .requestMatchers("/api/lost-objects/**").authenticated()
                        .requestMatchers("/api/found-objects/**").authenticated()

                        // Matching
                        .requestMatchers("/api/matches/**").authenticated()

                        // Messages
                        .requestMatchers("/api/conversations/**").authenticated()
                        .requestMatchers("/api/messages/**").authenticated()

                        // Notifications
                        .requestMatchers("/api/notifications/**").authenticated()

                        // Wallet & Transactions
                        .requestMatchers("/api/wallet/**").authenticated()
                        .requestMatchers("/api/transactions/**").authenticated()

                        // Payments
                        // Webhook provider de paiement (public, signé) — DOIT
                        // précéder /api/payments/** (l'ordre des matchers compte)
                        .requestMatchers(HttpMethod.POST, "/api/payments/webhook").permitAll()
                        .requestMatchers("/api/payments/**").authenticated()

                        // Escrow
                        .requestMatchers("/api/escrows/**").authenticated()

                        // Returns
                        .requestMatchers("/api/returns/**").authenticated()

                        // Reports - authenticated users can create, admin can manage
                        .requestMatchers(HttpMethod.POST, "/api/reports").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/reports/my").authenticated()
                        .requestMatchers("/api/reports/**").hasRole("ADMIN")

                        // Certification - authenticated users can request, admin can review
                        .requestMatchers(HttpMethod.POST, "/api/certification/request").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/certification/my-requests").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/certification/my-latest").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/certification/eligibility").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/certification/cancel/**").authenticated()
                        .requestMatchers("/api/certification/admin/**").hasRole("ADMIN")

                        // Interactions (likes & comments)
                        .requestMatchers(HttpMethod.GET, "/api/interactions/**").permitAll()
                        .requestMatchers("/api/interactions/**").authenticated()

                        // Saved objects
                        .requestMatchers("/api/saved/**").authenticated()

                        // Admin only
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // Finance (validation retraits, réconciliation — CDC §8.2)
                        .requestMatchers("/api/finance/**").hasRole("ADMIN")

                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Dynamically detect all local network IPs for LAN access
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
                    origins.add("http://" + ip + ":8080");
                }
            }
        } catch (Exception e) {
            // Fallback: CORS will still work for localhost
        }

        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
