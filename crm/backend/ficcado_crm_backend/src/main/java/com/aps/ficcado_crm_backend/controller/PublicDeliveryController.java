package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.DeliveryOptionDto.DeliveryOptionResponse;
import com.aps.ficcado_crm_backend.service.DeliveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public Storefront Delivery Options Controller.
 * Implements ADD-4 / Section P2-6: returns server-configured courier options.
 */
@Slf4j
@RestController
@RequestMapping("/api/public/delivery-options")
@Tag(name = "Public Delivery Options")
@RequiredArgsConstructor
public class PublicDeliveryController {

    private final DeliveryService deliveryService;

    @GetMapping
    @Operation(summary = "Get active delivery and courier options")
    public ResponseEntity<List<DeliveryOptionResponse>> getDeliveryOptions() {
        log.debug("Serving active delivery options");
        return ResponseEntity.ok(deliveryService.getActiveDeliveryOptions());
    }
}
