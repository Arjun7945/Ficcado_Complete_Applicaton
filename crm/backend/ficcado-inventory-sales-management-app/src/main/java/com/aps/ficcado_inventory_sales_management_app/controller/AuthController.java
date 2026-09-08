package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
    public ResponseEntity<Object> login(@RequestBody LoginRequest request,
                                        HttpServletRequest httpRequest,
                                        HttpServletResponse response) {
        log.info("CRM login attempt for email: {}", request.email());
        var maybeAdmin = authService.authenticate(request.email(), request.password());
        if (maybeAdmin.isEmpty()) {
            log.warn("CRM login failed for email: {}", request.email());
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
        }
        Admin admin = maybeAdmin.get();
        log.info("CRM login successful for admin: {} ({})", admin.getAdminName(), admin.getEmailId());
        String token = authService.generateToken(admin);
        Cookie cookie = buildSessionCookie(httpRequest, token, 86400);
        response.addCookie(cookie);
        return ResponseEntity.ok(AdminSummary.from(admin));
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    @PostMapping("/logout")
    @Operation(summary = "Admin logout — per-device: revokes this session's JWT only, clears cookie")
    public ResponseEntity<?> logout(@AuthenticationPrincipal Admin admin,
                                    HttpServletRequest httpRequest,
                                    HttpServletResponse response) {
        // Extract the raw token from the current request's cookie so we can revoke it.
        // Revoking adds this specific token to the denylist — other devices' tokens
        // are different and will NOT be affected (per-device logout semantics).
        String rawToken = extractTokenFromRequest(httpRequest);
        if (rawToken != null) {
            authService.revokeToken(rawToken, admin);
        } else {
            log.warn("Logout called with no session cookie present — nothing to revoke.");
        }

        // Clear the cookie on this device regardless
        Cookie cookie = buildSessionCookie(httpRequest, "", 0); // Max-Age=0 deletes the cookie
        response.addCookie(cookie);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    // ── Current Session ───────────────────────────────────────────────────────

    @GetMapping("/me")
    @Operation(summary = "Return current authenticated admin")
    public ResponseEntity<?> me(@AuthenticationPrincipal Admin admin) {
        if (admin == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        return ResponseEntity.ok(AdminSummary.from(admin));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Cookie buildSessionCookie(HttpServletRequest httpRequest, String value, int maxAgeSecs) {
        Cookie cookie = new Cookie(COOKIE_NAME, value);
        cookie.setHttpOnly(true);
        boolean isSecure = httpRequest.isSecure();
        cookie.setSecure(isSecure);     // Dynamic: false for local HTTP, true for HTTPS in production
        cookie.setPath("/");
        cookie.setMaxAge(maxAgeSecs);
        cookie.setAttribute("SameSite", isSecure ? "None" : "Lax");
        return cookie;
    }

    /**
     * Extract the raw JWT string from the incoming request's session cookie.
     * Used during logout to obtain the token that needs to be revoked.
     */
    private String extractTokenFromRequest(HttpServletRequest request) {
        // 1. Standard servlet cookie array
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

    // ── Inner records ─────────────────────────────────────────────────────────

    /**
     * Login request body.
     * CRM accepts email ONLY — no username field is exposed here.
     * Username-based login is intentionally excluded from this endpoint.
     */
    record LoginRequest(String email, String password) {}

    record AdminSummary(Long id, String adminName, String emailId,
                        String role, String notifications) {
        static AdminSummary from(Admin admin) {
            return new AdminSummary(
                    admin.getId(),
                    admin.getAdminName(),
                    admin.getEmailId(),
                    admin.getRole().name(),
                    admin.getNotifications().name()
            );
        }
    }
}
