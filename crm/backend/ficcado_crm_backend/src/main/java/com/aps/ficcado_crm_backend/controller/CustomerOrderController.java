package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerOrderLineItemDto;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerOrderSummaryResponse;
import com.aps.ficcado_crm_backend.entity.Customer;
import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.entity.SaleLineItem;
import com.aps.ficcado_crm_backend.repository.SaleRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Customer Order History Controller.
 *
 * Strict ownership enforcement: Customers can read ONLY their own orders
 * by querying sales matching their authenticated customer ID.
 */
@Slf4j
@RestController
@RequestMapping("/api/customer/orders")
@Tag(name = "Customer Orders")
@RequiredArgsConstructor
public class CustomerOrderController {

    private final SaleRepository saleRepository;

    @GetMapping
    @Operation(summary = "Get list of past orders for the authenticated customer")
    public ResponseEntity<?> getCustomerOrders(@AuthenticationPrincipal Customer customer) {
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    Map.of("success", false, "message", "Not authenticated")
            );
        }

        log.info("Fetching orders for customer [id={}, email={}]", customer.getId(), customer.getEmailId());
        List<Sale> sales = saleRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId());

        List<CustomerOrderSummaryResponse> orders = sales.stream().map(this::toOrderSummary).toList();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", orders
        ));
    }

    private CustomerOrderSummaryResponse toOrderSummary(Sale s) {
        List<CustomerOrderLineItemDto> lineItemDtos = (s.getLineItems() != null)
                ? s.getLineItems().stream().map(this::toLineItemDto).toList()
                : Collections.emptyList();

        BigDecimal subtotal = lineItemDtos.stream()
                .map(item -> item.priceEach().multiply(BigDecimal.valueOf(item.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CustomerOrderSummaryResponse(
                s.getId(),
                s.getInvoiceNumber(),
                s.getSaleStatus() != null ? s.getSaleStatus().name() : "COMPLETED",
                s.getPaymentStatus() != null ? s.getPaymentStatus().name() : "PAID",
                s.getDeliveryStatus() != null ? s.getDeliveryStatus().name() : "DELIVERED",
                "Standard Shipping",
                s.getTransactionId(),
                subtotal,
                s.getDeliveryChargeAmount() != null ? s.getDeliveryChargeAmount() : BigDecimal.ZERO,
                s.getTotalAmount() != null ? s.getTotalAmount() : subtotal,
                s.getCreatedAt(),
                lineItemDtos
        );
    }

    private CustomerOrderLineItemDto toLineItemDto(SaleLineItem item) {
        String slug = (item.getItemName() != null)
                ? item.getItemName().toLowerCase().replaceAll("[^a-z0-9]+", "-")
                : "item";
        String fallbackImg = "/images/items/" + slug + "/image-1.jpg";

        return new CustomerOrderLineItemDto(
                item.getId(),
                item.getItem() != null ? item.getItem().getId() : null,
                item.getItemName(),
                item.getSize(),
                item.getQuantity() != null ? item.getQuantity() : 1,
                item.getPriceEach() != null ? item.getPriceEach() : BigDecimal.ZERO,
                fallbackImg
        );
    }
}
