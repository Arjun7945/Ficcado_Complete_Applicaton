package com.aps.ficcado_website_data.controller;

import com.aps.ficcado_website_data.dto.OrderStatusNotificationRequest;
import com.aps.ficcado_website_data.entity.OrderNotification;
import com.aps.ficcado_website_data.service.OrderNotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/internal/notifications")
@RequiredArgsConstructor
public class InternalNotificationController {

    private final OrderNotificationService orderNotificationService;

    @Value("${app.internal.api-key:ficcado-internal-service-secret-key-change-in-prod}")
    private String internalApiKey;

    @PostMapping("/order-status")
    public ResponseEntity<?> receiveOrderStatusNotification(
            @RequestHeader(value = "X-Internal-Secret", required = false) String secretHeader,
            @Valid @RequestBody OrderStatusNotificationRequest request) {

        if (!validateSecret(secretHeader)) {
            log.warn("Unauthorized internal order notification attempt for transactionId={}", request.transactionId());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden: Invalid internal secret"));
        }

        log.info("Received internal order notification for transactionId={}, status={}",
                request.transactionId(), request.status());

        OrderNotification notification = orderNotificationService.processOrderStatus(request);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "transactionId", request.transactionId(),
                "status", request.status(),
                "notificationId", notification != null ? notification.getId() : null
        ));
    }

    private boolean validateSecret(String providedSecret) {
        if (providedSecret == null || providedSecret.isBlank()) return false;
        byte[] a = providedSecret.getBytes(StandardCharsets.UTF_8);
        byte[] b = internalApiKey.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }
}
