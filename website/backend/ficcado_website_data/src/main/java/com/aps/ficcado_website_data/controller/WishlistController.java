package com.aps.ficcado_website_data.controller;

import com.aps.ficcado_website_data.dto.WishlistDto.WishlistItemResponse;
import com.aps.ficcado_website_data.exception.UnauthorizedGatewayException;
import com.aps.ficcado_website_data.service.WishlistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @Value("${app.gateway.shared-secret:ficcado-gateway-internal-secret-2026}")
    private String gatewaySharedSecret;

    @GetMapping
    public ResponseEntity<List<WishlistItemResponse>> getWishlist(
            @RequestHeader(value = "X-Customer-Id", required = false) String customerIdHeader,
            @RequestHeader(value = "X-Gateway-Secret", required = false) String gatewaySecretHeader) {

        Long customerId = validateGatewayAuth(customerIdHeader, gatewaySecretHeader);
        List<WishlistItemResponse> wishlist = wishlistService.getWishlist(customerId);
        return ResponseEntity.ok(wishlist);
    }

    @PutMapping("/{itemId}")
    public ResponseEntity<WishlistItemResponse> addToWishlist(
            @PathVariable Long itemId,
            @RequestHeader(value = "X-Customer-Id", required = false) String customerIdHeader,
            @RequestHeader(value = "X-Gateway-Secret", required = false) String gatewaySecretHeader) {

        Long customerId = validateGatewayAuth(customerIdHeader, gatewaySecretHeader);
        WishlistItemResponse response = wishlistService.addToWishlist(customerId, itemId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> removeFromWishlist(
            @PathVariable Long itemId,
            @RequestHeader(value = "X-Customer-Id", required = false) String customerIdHeader,
            @RequestHeader(value = "X-Gateway-Secret", required = false) String gatewaySecretHeader) {

        Long customerId = validateGatewayAuth(customerIdHeader, gatewaySecretHeader);
        wishlistService.removeFromWishlist(customerId, itemId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Validates that the request was verified by the NGINX API Gateway.
     * Rejects direct or unverified requests with HTTP 401.
     */
    private Long validateGatewayAuth(String customerIdHeader, String gatewaySecretHeader) {
        if (gatewaySecretHeader == null || !gatewaySecretHeader.equals(gatewaySharedSecret)) {
            log.warn("Rejected wishlist request: missing or mismatched gateway shared secret");
            throw new UnauthorizedGatewayException("Missing or invalid gateway authorization credentials");
        }

        if (customerIdHeader == null || customerIdHeader.isBlank()) {
            log.warn("Rejected wishlist request: missing authenticated customer ID");
            throw new UnauthorizedGatewayException("Customer authentication required");
        }

        try {
            return Long.parseLong(customerIdHeader.trim());
        } catch (NumberFormatException e) {
            log.warn("Rejected wishlist request: invalid customer ID header '{}'", customerIdHeader);
            throw new UnauthorizedGatewayException("Invalid customer identity");
        }
    }
}
