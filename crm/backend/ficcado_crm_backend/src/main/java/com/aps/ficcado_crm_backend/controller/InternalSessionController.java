package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.service.CustomerAuthService;
import com.aps.ficcado_crm_backend.service.CustomerSessionService;
import com.aps.ficcado_crm_backend.session.CustomerSession;
import io.jsonwebtoken.Claims;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;

/**
 * Gateway Auth Subrequest Controller.
 * Invoked by NGINX auth_request (/_auth_customer_session) for customer-protected routes.
 *
 * Validates session in Redis (read-only without refreshing sliding window).
 * On success: returns 200 with X-Customer-Id header.
 * On invalid/expired: returns 401 Unauthorized.
 * On Redis outage: throws SessionServiceUnavailableException (503).
 */
@Slf4j
@RestController
@RequestMapping("/api/internal/session")
@Tag(name = "Internal Gateway Session Validation")
@RequiredArgsConstructor
public class InternalSessionController {

    public static final String COOKIE_NAME = "ficcado_customer_session";
    public static final String CUSTOMER_ID_HEADER = "X-Customer-Id";

    private final CustomerSessionService customerSessionService;
    private final CustomerAuthService customerAuthService;

    @GetMapping("/validate")
    @Operation(summary = "Internal session validation endpoint for NGINX auth_request")
    public ResponseEntity<?> validateSession(HttpServletRequest request, HttpServletResponse response) {
        String token = extractToken(request);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("valid", false, "message", "No session token provided"));
        }

        try {
            Claims claims = customerAuthService.validateCustomerToken(token);
            String sid = claims.get("sid", String.class);
            if (sid == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("valid", false, "message", "Token missing session id"));
            }

            // Read-only session validation (do not refresh during auth subrequest)
            Optional<CustomerSession> maybeSession = customerSessionService.validateSession(sid, false);
            if (maybeSession.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("valid", false, "message", "Session expired or not found"));
            }

            CustomerSession session = maybeSession.get();
            response.setHeader(CUSTOMER_ID_HEADER, session.customerId().toString());

            return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "customerId", session.customerId(),
                    "paused", session.isPaused()
            ));
        } catch (com.aps.ficcado_crm_backend.exception.SessionServiceUnavailableException e) {
            throw e;
        } catch (Exception e) {
            log.debug("Internal session validation failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("valid", false, "message", "Invalid session token"));
        }
    }

    private String extractToken(HttpServletRequest request) {
        if (request.getCookies() != null) {
            var cookie = Arrays.stream(request.getCookies())
                    .filter(c -> COOKIE_NAME.equals(c.getName()))
                    .map(Cookie::getValue)
                    .filter(v -> !v.isBlank())
                    .findFirst();
            if (cookie.isPresent()) return cookie.get();
        }

        String rawCookie = request.getHeader("Cookie");
        if (rawCookie != null && !rawCookie.isBlank()) {
            String token = Arrays.stream(rawCookie.split(";"))
                    .map(pair -> pair.trim().split("=", 2))
                    .filter(parts -> parts.length == 2 && COOKIE_NAME.equals(parts[0].trim()))
                    .map(parts -> parts[1].trim())
                    .findFirst()
                    .orElse(null);
            if (token != null && !token.isBlank()) return token;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }

        return null;
    }
}
