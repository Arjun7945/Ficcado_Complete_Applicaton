package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.AuthDto.AdminSummary;
import com.aps.ficcado_crm_backend.dto.AuthDto.LoginRequest;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.mapper.AuthMapper;
import com.aps.ficcado_crm_backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Map;

/**
 * Authentication endpoints for the Ficcado CRM.
 *
 * Login policy: email address ONLY. Username-based login is explicitly restricted.
 * (Phone number / email login for the public website is a separate system.)
 *
 * Logout policy: per-device. Logging out revokes only the specific JWT presented
 * in the current request's cookie. Other concurrent sessions (other devices/browsers
 * for the same admin) hold different tokens and are NOT affected.
 *
 * Issues and clears the httpOnly "ficcado_session" cookie containing the JWT.
 */
@Slf4j
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication")
@RequiredArgsConstructor
public class AuthController {

    private static final String COOKIE_NAME = "ficcado_session";
    private final AuthService authService;

    // ── Login ─────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    @Operation(summary = "Admin login — email only — sets httpOnly JWT cookie")
    public ResponseEntity<Object> login(@Valid @RequestBody LoginRequest request,
                                        HttpServletRequest httpRequest,
                                        HttpServletResponse response) {
        log.info("CRM login attempt for email: {}", request.email());
        var maybeAdmin = authService.authenticate(request.email(), request.password());
        if (maybeAdmin.isEmpty()) {
            log.warn("CRM login failed for email: {}", request.email());
            org.springframework.http.ProblemDetail pd = org.springframework.http.ProblemDetail.forStatusAndDetail(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Invalid email or password");
            pd.setType(java.net.URI.create("urn:ficcado:invalid-credentials"));
            pd.setTitle("Unauthorized");
            pd.setProperty("error", "Invalid email or password");
            pd.setProperty("timestamp", java.time.Instant.now());
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body(pd);
        }
        Admin admin = maybeAdmin.get();
        log.info("CRM login successful for admin: {} ({})", admin.getAdminName(), admin.getEmailId());
        String token = authService.generateToken(admin);
        Cookie cookie = buildSessionCookie(httpRequest, token, 86400);
        response.addCookie(cookie);
        return ResponseEntity.ok(AuthMapper.toSummary(admin));
    }


    // ── Logout ────────────────────────────────────────────────────────────────

    @PostMapping("/logout")
    @Operation(summary = "Admin logout — per-device: revokes this session's JWT only, clears cookie")
    public ResponseEntity<?> logout(@AuthenticationPrincipal Admin admin,
                                    HttpServletRequest httpRequest,
                                    HttpServletResponse response) {
        String rawToken = extractTokenFromRequest(httpRequest);
        if (rawToken != null) {
            authService.revokeToken(rawToken, admin);
        } else {
            log.warn("Logout called with no session cookie present — nothing to revoke.");
        }

        Cookie cookie = buildSessionCookie(httpRequest, "", 0); // Max-Age=0 deletes the cookie
        response.addCookie(cookie);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    // ── Current Session ───────────────────────────────────────────────────────

    @GetMapping("/me")
    @Operation(summary = "Return current authenticated admin")
    public ResponseEntity<?> me(@AuthenticationPrincipal Admin admin) {
        if (admin == null) {
            org.springframework.http.ProblemDetail pd = org.springframework.http.ProblemDetail.forStatusAndDetail(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Not authenticated");
            pd.setType(java.net.URI.create("urn:ficcado:unauthorized"));
            pd.setTitle("Unauthorized");
            pd.setProperty("error", "Not authenticated");
            pd.setProperty("timestamp", java.time.Instant.now());
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body(pd);
        }
        return ResponseEntity.ok(AuthMapper.toSummary(admin));
    }


    // ── Helpers ───────────────────────────────────────────────────────────────

    private Cookie buildSessionCookie(HttpServletRequest httpRequest, String value, int maxAgeSecs) {
        Cookie cookie = new Cookie(COOKIE_NAME, value);
        cookie.setHttpOnly(true);
        boolean isSecure = httpRequest.isSecure();
        cookie.setSecure(isSecure);
        cookie.setPath("/");
        cookie.setMaxAge(maxAgeSecs);
        cookie.setAttribute("SameSite", isSecure ? "None" : "Lax");
        return cookie;
    }

    private String extractTokenFromRequest(HttpServletRequest request) {
        if (request.getCookies() != null) {
            return Arrays.stream(request.getCookies())
                    .filter(c -> COOKIE_NAME.equals(c.getName()))
                    .map(Cookie::getValue)
                    .filter(v -> !v.isBlank())
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }
}
