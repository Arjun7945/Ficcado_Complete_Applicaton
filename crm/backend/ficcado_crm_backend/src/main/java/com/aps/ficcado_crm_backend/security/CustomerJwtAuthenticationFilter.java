package com.aps.ficcado_crm_backend.security;

import com.aps.ficcado_crm_backend.service.CustomerAuthService;
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
 * Reads and authenticates customer JWTs from the "ficcado_customer_session" httpOnly cookie.
 *
 * Dedicated strictly to customer requests:
 * - Admin tokens are rejected by CustomerAuthService.
 * - Customer tokens are rejected by JwtAuthenticationFilter (admin filter).
 * - Issues ROLE_CUSTOMER authority only.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CustomerJwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String COOKIE_NAME = "ficcado_customer_session";

    private final CustomerAuthService customerAuthService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // If already authenticated by another filter, proceed
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = extractCustomerToken(request);

            if (token != null) {
                customerAuthService.getCustomerFromToken(token).ifPresent(customer -> {
                    var auth = new UsernamePasswordAuthenticationToken(
                            customer,
                            null,
                            List.of(new SimpleGrantedAuthority(CustomerAuthService.CUSTOMER_ROLE))
                    );
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    log.debug("Authenticated customer [id={}, email={}]", customer.getId(), customer.getEmailId());
                });
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractCustomerToken(HttpServletRequest request) {
        // 1. Check Servlet cookies
        if (request.getCookies() != null) {
            var maybeCookie = Arrays.stream(request.getCookies())
                    .filter(c -> COOKIE_NAME.equals(c.getName()))
                    .map(Cookie::getValue)
                    .findFirst();
            if (maybeCookie.isPresent() && !maybeCookie.get().isBlank()) {
                return maybeCookie.get();
            }
        }

        // 2. Raw Cookie header fallback (e.g. from reverse proxy fetch)
        String rawCookie = request.getHeader("Cookie");
        if (rawCookie != null && !rawCookie.isBlank()) {
            String token = Arrays.stream(rawCookie.split(";"))
                    .map(pair -> pair.trim().split("=", 2))
                    .filter(parts -> parts.length == 2 && COOKIE_NAME.equals(parts[0].trim()))
                    .map(parts -> parts[1].trim())
                    .findFirst()
                    .orElse(null);
            if (token != null && !token.isBlank()) {
                return token;
            }
        }

        // 3. Authorization header (Bearer <token>)
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }

        return null;
    }
}
