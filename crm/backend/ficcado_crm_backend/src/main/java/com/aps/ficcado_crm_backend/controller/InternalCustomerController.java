package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerAuthResponse;
import com.aps.ficcado_crm_backend.service.CustomerAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
 * - Used by Ficcado-Website-Data upon successful OTP verification.
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

    @PostMapping("/otp-login")
    @Operation(summary = "Complete OTP verification handshake and issue Customer JWT")
    public ResponseEntity<?> otpLogin(
            @RequestHeader(value = "X-Internal-Secret", required = false) String secretHeader,
            @RequestBody Map<String, String> body) {
        if (!validateSecret(secretHeader)) {
            log.warn("Unauthorized internal customer OTP login attempt");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden: Invalid internal secret"));
        }

        String email = body.get("email");
        String phone = body.get("phone");
        String name = body.get("name");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }

        CustomerAuthResponse response = customerAuthService.authenticateViaVerifiedOtp(email, phone, name);
        return ResponseEntity.ok(response);
    }

    private boolean validateSecret(String providedSecret) {
        if (providedSecret == null || providedSecret.isBlank()) return false;
        byte[] a = providedSecret.getBytes(StandardCharsets.UTF_8);
        byte[] b = internalApiKey.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }
}
