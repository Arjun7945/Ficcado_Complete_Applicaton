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
    public static final String BACKGROUND_HEADER = "X-Ficcado-Background";

    private final CustomerAuthService customerAuthService;

    @org.springframework.beans.factory.annotation.Value("${app.gateway.shared-secret:ficcado-gateway-internal-secret-2026}")
    private String gatewaySharedSecret;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // If already authenticated by another filter, proceed
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = extractCustomerToken(request);

            if (token != null) {
                try {
                    String uri = request.getRequestURI();
                    boolean isBackground = "1".equals(request.getHeader(BACKGROUND_HEADER))
                            || uri.endsWith("/api/customer/session")
                            || uri.startsWith("/api/internal/");

                    customerAuthService.getCustomerFromToken(token, !isBackground).ifPresent(customer -> {
                        var auth = new UsernamePasswordAuthenticationToken(
                                customer,
                                null,
                                List.of(new SimpleGrantedAuthority(CustomerAuthService.CUSTOMER_ROLE))
                        );
                        SecurityContextHolder.getContext().setAuthentication(auth);
                        log.debug("Authenticated customer [id={}, email={}]", customer.getId(), customer.getEmailId());
                    });
                } catch (com.aps.ficcado_crm_backend.exception.SessionServiceUnavailableException e) {
                    log.error("Session store unavailable during customer authentication: {}", e.getMessage());
                    writeSessionUnavailableResponse(response, e.getMessage());
                    return; // Fail closed! Do not proceed to protected endpoints.
                }
            } else {
                // Secondary fallback: Gateway authentication via verified X-Gateway-Secret and X-Customer-Id
                String gatewaySecret = request.getHeader("X-Gateway-Secret");
                String customerIdHeader = request.getHeader("X-Customer-Id");
                if (gatewaySecret != null && gatewaySecret.equals(gatewaySharedSecret)
                        && customerIdHeader != null && !customerIdHeader.isBlank()) {
                    try {
                        Long customerId = Long.parseLong(customerIdHeader.trim());
                        customerAuthService.getCustomerById(customerId).ifPresent(customer -> {
                            var auth = new UsernamePasswordAuthenticationToken(
                                    customer,
                                    null,
                                    List.of(new SimpleGrantedAuthority(CustomerAuthService.CUSTOMER_ROLE))
                            );
                            SecurityContextHolder.getContext().setAuthentication(auth);
                            log.debug("Authenticated customer via gateway headers [id={}, email={}]", customer.getId(), customer.getEmailId());
                        });
                    } catch (NumberFormatException e) {
                        log.warn("Invalid X-Customer-Id header from gateway: {}", customerIdHeader);
                    }
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private void writeSessionUnavailableResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
        response.setContentType("application/problem+json");
        response.setCharacterEncoding("UTF-8");
        String json = """
                {"type":"urn:ficcado:session-store-unavailable","title":"SESSION_STORE_UNAVAILABLE","status":503,"detail":"%s","code":"SESSION_STORE_UNAVAILABLE"}
                """.formatted(message != null ? message : "Session service temporarily unavailable").trim();
        response.getWriter().write(json);
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
