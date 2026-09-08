package com.aps.ficcado_inventory_sales_management_app.security;

import com.aps.ficcado_inventory_sales_management_app.service.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

/**
 * Reads the JWT from the httpOnly cookie "ficcado_session",
 * validates it, checks the per-device revocation denylist, and sets
 * the Spring Security context.
 *
 * Denylist check: if the token was explicitly revoked (logged out on this device),
 * it is treated as unauthenticated — even if the JWT signature and expiry are still
 * technically valid. This implements real server-side logout invalidation.
 *
 * Per-device semantics: only the specific token presented in this request is checked.
 * Tokens issued to the same admin on other devices are different strings with
 * different hashes — they are NOT affected by this check.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String COOKIE_NAME = "ficcado_session";

    private final AuthService authService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractTokenFromCookie(request);

        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {

            // Step 1: Check denylist — if this specific token was revoked (device logged out),
            //         treat as unauthenticated without even loading the admin record.
            if (authService.isTokenRevoked(token)) {
                log.debug("Rejected revoked token — per-device logout is active for this session.");
                filterChain.doFilter(request, response);
                return;
            }

            // Step 2: Validate JWT signature + expiry and load the admin
            authService.getAdminFromToken(token).ifPresent(admin -> {
                var auth = new UsernamePasswordAuthenticationToken(
                        admin,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + admin.getRole().name()))
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            });
        }

        filterChain.doFilter(request, response);
    }

    private String extractTokenFromCookie(HttpServletRequest request) {
        // 1. Servlet cookies array
        if (request.getCookies() != null) {
            var maybeCookie = Arrays.stream(request.getCookies())
                    .filter(c -> COOKIE_NAME.equals(c.getName()))
                    .map(Cookie::getValue)
                    .findFirst();
            if (maybeCookie.isPresent() && !maybeCookie.get().isBlank()) {
                return maybeCookie.get();
            }
        }

        // 2. Raw Cookie header fallback (e.g. from proxy fetch)
        String rawCookie = request.getHeader("Cookie");
        if (rawCookie != null && !rawCookie.isBlank()) {
            for (String pair : rawCookie.split(";")) {
                String[] parts = pair.trim().split("=", 2);
                if (parts.length == 2 && COOKIE_NAME.equals(parts[0].trim())) {
                    return parts[1].trim();
                }
            }
        }

        // 3. Authorization header fallback (Bearer <token>)
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }

        return null;
    }
}
