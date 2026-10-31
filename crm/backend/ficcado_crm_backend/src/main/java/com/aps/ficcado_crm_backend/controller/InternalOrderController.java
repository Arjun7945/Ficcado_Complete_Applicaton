package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.InternalOrderDto.*;
import com.aps.ficcado_crm_backend.service.WebsiteOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

/**
 * Service-to-Service Internal Order / Sale Creation Controller.
 * Refactored to a thin controller delegating business transactions to WebsiteOrderService (ADD-3, Section 5.2).
 *
 * Security:
 * - Blocked from public access by the NGINX API Gateway (returns 403).
 * - Enforces shared secret verification via X-Internal-Secret compared in constant time.
 * - Used by Ficcado-Payment-Gateway-Data upon verified online payment.
 *
 * Guarantees:
 * - Idempotency: Duplicate transactionId returns existing sale without double stock deduction.
 * - Stock safety: Verifies inventory with row locking inside @Transactional service boundary before deducting.
 * - Online-only: Enforces PAID status with online payment mode.
 * - Server-side quote: Computes unit prices, line totals, delivery charge, and stock availability from database.
 * - Remarks: Strictly set to "WEBSITE SALE".
 */
@Slf4j
@RestController
@RequestMapping("/api/internal/orders")
@Tag(name = "Internal Order Handshakes")
@RequiredArgsConstructor
public class InternalOrderController {

    private final WebsiteOrderService websiteOrderService;

    @Value("${app.internal.api-key:ficcado-internal-service-secret-key-change-in-prod}")
    private String internalApiKey;

    @PostMapping(value = {"/create-paid-sale", "/website-orders"})
    @Operation(summary = "Create an official Sale and deduct inventory for a verified online payment")
    public ResponseEntity<?> createPaidSale(
            @RequestHeader(value = "X-Internal-Secret", required = false) String secretHeader,
            @Valid @RequestBody CreatePaidSaleRequest request) {

        if (!validateSecret(secretHeader)) {
            log.warn("Unauthorized internal paid sale creation attempt for transactionId={}", request.transactionId());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new InternalSaleResponse(false, "Forbidden: Invalid internal secret", null, null, null, null, false));
        }

        return websiteOrderService.createPaidWebsiteSale(request);
    }

    @PostMapping("/quote")
    @Operation(summary = "Calculate official server-side quote with verified prices, stock availability, and delivery charges")
    public ResponseEntity<?> calculateQuote(
            @RequestHeader(value = "X-Internal-Secret", required = false) String secretHeader,
            @Valid @RequestBody QuoteRequest request) {

        if (!validateSecret(secretHeader)) {
            log.warn("Unauthorized internal quote calculation attempt");
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new OrderQuoteResponse(false, "Forbidden: Invalid internal secret", List.of(), BigDecimal.ZERO, BigDecimal.ZERO, null, null, BigDecimal.ZERO));
        }

        return websiteOrderService.calculateQuote(request);
    }

    private boolean validateSecret(String providedSecret) {
        if (providedSecret == null || providedSecret.isBlank()) return false;
        byte[] a = providedSecret.getBytes(StandardCharsets.UTF_8);
        byte[] b = internalApiKey.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }
}
