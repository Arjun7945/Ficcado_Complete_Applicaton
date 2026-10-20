package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.InternalOrderDto.*;
import com.aps.ficcado_crm_backend.entity.Inventory;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.entity.SaleLineItem;
import com.aps.ficcado_crm_backend.entity.enums.DeliveryStatus;
import com.aps.ficcado_crm_backend.entity.enums.FulfilmentSource;
import com.aps.ficcado_crm_backend.entity.enums.PaymentStatus;
import com.aps.ficcado_crm_backend.entity.enums.SaleStatus;
import com.aps.ficcado_crm_backend.repository.InventoryRepository;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.repository.SaleRepository;
import com.aps.ficcado_crm_backend.service.SaleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service-to-Service Internal Order / Sale Creation Controller.
 *
 * Security:
 * - Blocked from public access by the NGINX API Gateway (returns 403).
 * - Enforces shared secret verification via X-Internal-Secret compared in constant time.
 * - Used by Ficcado-Payment-Gateway-Data upon verified online payment.
 *
 * Guarantees:
 * - Idempotency: Duplicate transactionId returns existing sale without double stock deduction.
 * - Stock safety: Verifies inventory before deducting.
 * - Online-only: Enforces PAID status with online payment mode.
 */
@Slf4j
@RestController
@RequestMapping("/api/internal/orders")
@Tag(name = "Internal Order Handshakes")
@RequiredArgsConstructor
public class InternalOrderController {

    private final SaleRepository saleRepository;
    private final ItemRepository itemRepository;
    private final InventoryRepository inventoryRepository;
    private final SaleService saleService;

    @Value("${app.internal.api-key:ficcado-internal-service-secret-key-change-in-prod}")
    private String internalApiKey;

    @PostMapping("/create-paid-sale")
    @Operation(summary = "Create an official Sale and deduct inventory for a verified online payment")
    @Transactional
    public ResponseEntity<?> createPaidSale(
            @RequestHeader(value = "X-Internal-Secret", required = false) String secretHeader,
            @Valid @RequestBody CreatePaidSaleRequest request) {

        if (!validateSecret(secretHeader)) {
            log.warn("Unauthorized internal paid sale creation attempt for transactionId={}", request.transactionId());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new InternalSaleResponse(false, "Forbidden: Invalid internal secret", null, null, null, null, false));
        }

        log.info("Processing internal paid sale creation for transactionId={}, customer={}",
                request.transactionId(), request.customerEmail());

        // 1. Idempotency Check: Return existing sale if transaction already processed
        Optional<Sale> existing = saleRepository.findByTransactionId(request.transactionId());
        if (existing.isPresent()) {
            Sale s = existing.get();
            log.info("Duplicate payment transaction detected for transactionId={}. Returning existing sale [id={}, invoice={}]",
                    request.transactionId(), s.getId(), s.getInvoiceNumber());
            return ResponseEntity.ok(new InternalSaleResponse(
                    true,
                    "Sale already recorded for this transaction",
                    s.getId(),
                    s.getInvoiceNumber(),
                    s.getTotalAmount(),
                    s.getSaleStatus().name(),
                    true
            ));
        }

        // 2. Resolve Items & Validate Stock
        List<SaleLineItem> lineItems = new ArrayList<>();
        for (InternalOrderLineItem itemReq : request.lineItems()) {
            Optional<Item> itemOpt = Optional.empty();
            if (itemReq.itemId() != null) {
                itemOpt = itemRepository.findById(itemReq.itemId());
            }
            if (itemOpt.isEmpty() && itemReq.itemName() != null && !itemReq.itemName().isBlank()) {
                itemOpt = itemRepository.findByItemNameIgnoreCase(itemReq.itemName().trim());
            }

            if (itemOpt.isEmpty()) {
                log.error("Item '{}' not found in catalog during sale creation", itemReq.itemName());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new InternalSaleResponse(false, "Item not found: " + itemReq.itemName(), null, null, null, null, false));
            }

            Item item = itemOpt.get();

            // Check inventory stock
            Optional<Inventory> invOpt = inventoryRepository.findByItemIdAndSize(item.getId(), itemReq.size());
            int availableStock = invOpt.map(Inventory::getTotalQuantity).orElse(0);
            if (availableStock < itemReq.quantity()) {
                log.error("Insufficient stock for item '{}' (size {}). Available: {}, Requested: {}",
                        item.getItemName(), itemReq.size(), availableStock, itemReq.quantity());
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new InternalSaleResponse(
                                false,
                                "INSUFFICIENT_STOCK: Item " + item.getItemName() + " (" + itemReq.size() + ") has " + availableStock + " left",
                                null, null, null, null, false
                        ));
            }

            BigDecimal lineTotal = itemReq.priceEach().multiply(BigDecimal.valueOf(itemReq.quantity()));
            SaleLineItem lineItem = SaleLineItem.builder()
                    .item(item)
                    .itemName(item.getItemName())
                    .size(itemReq.size())
                    .quantity(itemReq.quantity())
                    .priceEach(itemReq.priceEach())
                    .totalPrice(lineTotal)
                    .build();

            lineItems.add(lineItem);
        }

        // 3. Generate unique invoice number: FIC-INV-[timestamp]
        String invoiceNumber = generateUniqueInvoiceNumber();

        // 4. Construct Sale entity
        BigDecimal deliveryCharge = request.deliveryChargeAmount() != null ? request.deliveryChargeAmount() : BigDecimal.ZERO;
        boolean deliveryEnabled = deliveryCharge.compareTo(BigDecimal.ZERO) > 0;

        Sale sale = Sale.builder()
                .invoiceNumber(invoiceNumber)
                .saleStatus(SaleStatus.COMPLETED)
                .paymentStatus(PaymentStatus.PAID)
                .modeOfPayment("ONLINE_RAZORPAY")
                .transactionId(request.transactionId())
                .deliveryStatus(DeliveryStatus.PENDING)
                .customerName(request.customerName())
                .customerEmail(request.customerEmail())
                .customerPhoneNumber(request.customerPhone())
                .customerAddress(request.customerAddress())
                .deliveryChargeEnabled(deliveryEnabled)
                .deliveryChargeAmount(deliveryCharge)
                .totalAmount(request.amount())
                .fulfilmentSource(FulfilmentSource.TAKE_FROM_INVENTORY)
                .fulfilmentRequestStatus("Normal")
                .remarks("Website order via Razorpay | Order ID: " + (request.razorpayOrderId() != null ? request.razorpayOrderId() : "N/A"))
                .lineItems(new ArrayList<>())
                .build();

        for (SaleLineItem li : lineItems) {
            li.setSale(sale);
            sale.getLineItems().add(li);
        }

        // 5. Delegate to SaleService.createSale (system admin = null)
        Sale saved = saleService.createSale(sale, null);

        log.info("Successfully recorded online sale [invoice={}, id={}, total={}]",
                saved.getInvoiceNumber(), saved.getId(), saved.getTotalAmount());

        return ResponseEntity.status(HttpStatus.CREATED).body(new InternalSaleResponse(
                true,
                "Sale created successfully",
                saved.getId(),
                saved.getInvoiceNumber(),
                saved.getTotalAmount(),
                saved.getSaleStatus().name(),
                false
        ));
    }

    private String generateUniqueInvoiceNumber() {
        long timestamp = Instant.now().toEpochMilli();
        String candidate = "FIC-INV-" + timestamp;
        int count = 1;
        while (saleRepository.existsByInvoiceNumber(candidate)) {
            candidate = "FIC-INV-" + timestamp + "-" + count++;
        }
        return candidate;
    }

    private boolean validateSecret(String providedSecret) {
        if (providedSecret == null || providedSecret.isBlank()) return false;
        byte[] a = providedSecret.getBytes(StandardCharsets.UTF_8);
        byte[] b = internalApiKey.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }
}
