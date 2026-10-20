package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerAuthResponse;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerLoginRequest;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerRegistrationRequest;
import com.aps.ficcado_crm_backend.entity.Customer;
import com.aps.ficcado_crm_backend.service.CustomerAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Map;

/**
 * Storefront Customer Authentication Endpoints.
 *
 * Handles customer sign-up, password login, logout, and session checks.
 * Sets the httpOnly "ficcado_customer_session" cookie.
 */
@Slf4j
@RestController
@RequestMapping("/api/customer/auth")
@Tag(name = "Customer Authentication")
@RequiredArgsConstructor
public class CustomerAuthController {

    public static final String COOKIE_NAME = "ficcado_customer_session";

    private final CustomerAuthService customerAuthService;

    @PostMapping("/register")
    @Operation(summary = "Customer registration — creates customer account and issues session")
    public ResponseEntity<CustomerAuthResponse> register(
            @Valid @RequestBody CustomerRegistrationRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        log.info("Customer registration attempt for email: {}", request.email());

        CustomerAuthResponse response = customerAuthService.registerCustomer(request);
        if (!response.success()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        if (response.token() != null) {
            Cookie cookie = buildSessionCookie(httpRequest, response.token(), 86400);
            httpResponse.addCookie(cookie);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    @Operation(summary = "Customer login — email & password — sets httpOnly ficcado_customer_session cookie")
    public ResponseEntity<CustomerAuthResponse> login(
            @Valid @RequestBody CustomerLoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        log.info("Customer login attempt for email: {}", request.email());

        var maybeCustomer = customerAuthService.authenticate(request.email(), request.password());
        if (maybeCustomer.isEmpty()) {
            log.warn("Customer login failed for email: {}", request.email());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    new CustomerAuthResponse(false, "Invalid email address or password.", null, null)
            );
        }

        Customer customer = maybeCustomer.get();
        String token = customerAuthService.generateCustomerToken(customer);
        Cookie cookie = buildSessionCookie(httpRequest, token, 86400);
        httpResponse.addCookie(cookie);

        log.info("Customer login successful [id={}, email={}]", customer.getId(), customer.getEmailId());
        return ResponseEntity.ok(new CustomerAuthResponse(
                true, "Login successful", token, customerAuthService.mapToProfileResponse(customer)
        ));
    }

    @PostMapping("/logout")
    @Operation(summary = "Customer logout — revokes current customer session and clears cookie")
    public ResponseEntity<?> logout(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        String token = extractTokenFromRequest(httpRequest);
        if (token != null) {
            customerAuthService.revokeToken(token);
        }

        Cookie cookie = buildSessionCookie(httpRequest, "", 0);
        httpResponse.addCookie(cookie);
        return ResponseEntity.ok(Map.of("success", true, "message", "Logged out successfully"));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated customer profile")
    public ResponseEntity<?> me(@AuthenticationPrincipal Customer customer) {
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    Map.of("success", false, "message", "Not authenticated")
            );
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", customerAuthService.mapToProfileResponse(customer)
        ));
    }

    // ── Cookie Helpers ────────────────────────────────────────────────────────

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
