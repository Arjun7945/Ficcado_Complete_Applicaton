package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.service.CustomerAuthService;
import com.aps.ficcado_crm_backend.service.CustomerSessionService;
import com.aps.ficcado_crm_backend.session.CustomerSession;
import io.jsonwebtoken.Claims;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;

/**
 * Customer Session Lifecycle Controller.
 * Provides endpoints to inspect remaining session lifetime, touch session sliding window, and pause for payment.
 */
@Slf4j
@RestController
@RequestMapping("/api/customer/session")
@Tag(name = "Customer Session")
@RequiredArgsConstructor
public class CustomerSessionController {

    public static final String COOKIE_NAME = "ficcado_customer_session";

    private final CustomerSessionService customerSessionService;
    private final CustomerAuthService customerAuthService;

    @GetMapping
    @Operation(summary = "Check current customer session (read-only, does not refresh sliding window)")
    public ResponseEntity<?> getSession(HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null) {
            return ResponseEntity.ok(Map.of("active", false, "remainingSeconds", 0L));
        }

        try {
            Claims claims = customerAuthService.validateCustomerToken(token);
            String sid = claims.get("sid", String.class);
            if (sid == null) {
                return ResponseEntity.ok(Map.of("active", false, "remainingSeconds", 0L));
            }

            Optional<CustomerSession> maybeSession = customerSessionService.getSession(sid);
            if (maybeSession.isEmpty()) {
                return ResponseEntity.ok(Map.of("active", false, "remainingSeconds", 0L));
            }

            CustomerSession session = maybeSession.get();
            long remaining = customerSessionService.getRemainingSeconds(sid);
            if (remaining <= 0 && !session.isPaused()) {
                return ResponseEntity.ok(Map.of("active", false, "remainingSeconds", 0L));
            }

            return ResponseEntity.ok(Map.of(
                    "active", true,
                    "remainingSeconds", remaining,
                    "customerId", session.customerId(),
                    "paused", session.isPaused()
            ));
        } catch (com.aps.ficcado_crm_backend.exception.SessionServiceUnavailableException e) {
            throw e;
        } catch (Exception e) {
            log.debug("Session check token invalid: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("active", false, "remainingSeconds", 0L));
        }
    }

    @PostMapping("/touch")
    @Operation(summary = "Touch customer session to extend sliding idle timeout to 600s")
    public ResponseEntity<?> touchSession(HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("active", false, "message", "No session token provided"));
        }

        try {
            Claims claims = customerAuthService.validateCustomerToken(token);
            String sid = claims.get("sid", String.class);
            if (sid == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("active", false, "message", "Session token missing session id"));
            }

            Optional<CustomerSession> touched = customerSessionService.touchSession(sid);
            if (touched.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("active", false, "message", "Session expired or not found"));
            }

            long remaining = customerSessionService.getRemainingSeconds(sid);
            return ResponseEntity.ok(Map.of(
                    "active", true,
                    "remainingSeconds", remaining > 0 ? remaining : customerSessionService.getIdleTimeoutSeconds()
            ));
        } catch (com.aps.ficcado_crm_backend.exception.SessionServiceUnavailableException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("active", false, "message", "Invalid session token"));
        }
    }

    @PostMapping("/pause")
    @Operation(summary = "Pause customer session for payment (up to 15 minutes)")
    public ResponseEntity<?> pauseSession(
            @RequestParam(name = "minutes", defaultValue = "15") int minutes,
            HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("active", false, "message", "No session token provided"));
        }

        try {
            Claims claims = customerAuthService.validateCustomerToken(token);
            String sid = claims.get("sid", String.class);
            if (sid == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("active", false, "message", "Session token missing session id"));
            }

            Optional<CustomerSession> paused = customerSessionService.pauseSession(sid, minutes);
            if (paused.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("active", false, "message", "Session expired or not found"));
            }

            return ResponseEntity.ok(Map.of(
                    "active", true,
                    "paused", true,
                    "pausedUntil", paused.get().pausedUntil().toString()
            ));
        } catch (com.aps.ficcado_crm_backend.exception.SessionServiceUnavailableException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("active", false, "message", "Invalid session token"));
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
