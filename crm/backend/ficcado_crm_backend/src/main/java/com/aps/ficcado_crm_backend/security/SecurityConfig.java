package com.aps.ficcado_crm_backend.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Spring Security configuration.
 *
 * CORS: all allowed origins read from CORS_ALLOWED_ORIGINS env var (comma-separated).
 * No URL, domain, or hosting platform is hardcoded here.
 * Zero code change needed when hosting is chosen — only the env var changes.
 *
 * Permitted without auth:
 *   POST /api/auth/login
 *   GET/POST /v3/api-docs/**
 *   GET /swagger-ui/**
 *   GET /actuator/health
 *
 * All other /api/** require a valid JWT in the ficcado_session cookie.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomerJwtAuthenticationFilter customerJwtAuthenticationFilter;
    private final RateLimitingFilter rateLimitingFilter;

    @Value("${app.cors.allowed-origins}")
    private String allowedOriginsRaw;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF — stateless JWT session, not cookie-session
                .csrf(AbstractHttpConfigurer::disable)

                // CORS — all origins from env var
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Stateless session — no HttpSession created
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Route authorization
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        // Public storefront (read-only GET) & review endpoints — narrow, explicit matchers only
                        .requestMatchers(HttpMethod.GET, "/api/public/products/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/public/categories/**").permitAll()
                        .requestMatchers("/api/public/reviews/**").permitAll()
                        // Customer unauthenticated auth routes & internal service routes
                        .requestMatchers("/api/customer/auth/**").permitAll()
                        .requestMatchers("/api/internal/**").permitAll()
                        // Customer authenticated profile & orders
                        .requestMatchers("/api/customer/**").hasAuthority("ROLE_CUSTOMER")
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**",
                                "/swagger-ui.html", "/actuator/health").permitAll()
                        .anyRequest().authenticated()
                )

                // Rate limiting filter first to drop excessive traffic early
                .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
                // Admin JWT filter before Spring's UsernamePasswordAuthenticationFilter
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                // Customer JWT filter before Spring's UsernamePasswordAuthenticationFilter
                .addFilterBefore(customerJwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Read allowed origins entirely from env var — no hardcoded URLs
        List<String> origins = Arrays.stream(allowedOriginsRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();

        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Requested-With", "Origin", "Cookie"));
        config.setAllowCredentials(true);   // Required for httpOnly cookie to be sent cross-origin
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
