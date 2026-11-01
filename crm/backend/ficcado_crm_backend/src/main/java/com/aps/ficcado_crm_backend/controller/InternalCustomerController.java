package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.service.CustomerAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

/**
 * Service-to-Service Internal Customer Management Controller.
 *
 * Security:
 * - Blocked from public access by the NGINX API Gateway (returns 403).
 * - Enforces shared secret verification via X-Internal-Secret compared in constant time.
 * - Used by Ficcado-Website-Data for password reset & customer checks.
 */
@Slf4j
@RestController
@RequestMapping("/api/internal/customer")
@Tag(name = "Internal Service Handshakes")
@RequiredArgsConstructor
public class InternalCustomerController {

    private final CustomerAuthService customerAuthService;

    @Value("${app.internal.api-key:ficcado-internal-service-secret-key-change-in-prod}")
    private String internalApiKey;

    @GetMapping("/exists")
    @Operation(summary = "Check if customer exists by email for password reset eligibility")
    public ResponseEntity<Map<String, Boolean>> checkCustomerExists(
            @RequestHeader(value = "X-Internal-Secret", required = false) String secretHeader,
            @RequestParam("email") String email) {
        if (!validateSecret(secretHeader)) {
            log.warn("Unauthorized internal customer exists check attempt");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        boolean exists = customerAuthService.customerExists(email);
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    public record InternalResetPasswordRequest(
            @NotBlank String email,
            @NotBlank String newPassword
    ) {}

    @PostMapping("/reset-password")
    @Operation(summary = "Set new customer password, set emailVerifiedAt, and invalidate all active sessions")
    public ResponseEntity<?> resetPassword(
            @RequestHeader(value = "X-Internal-Secret", required = false) String secretHeader,
            @RequestBody InternalResetPasswordRequest body) {
        if (!validateSecret(secretHeader)) {
            log.warn("Unauthorized internal customer password reset attempt");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden: Invalid internal secret"));
        }

        if (body.email() == null || body.email().isBlank() || body.newPassword() == null || body.newPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and newPassword are required"));
        }

        try {
            customerAuthService.resetPassword(body.email(), body.newPassword());
            return ResponseEntity.ok(Map.of("success", true, "message", "Password updated successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    private boolean validateSecret(String providedSecret) {
        if (providedSecret == null || providedSecret.isBlank()) return false;
        byte[] a = providedSecret.getBytes(StandardCharsets.UTF_8);
        byte[] b = internalApiKey.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }
}
