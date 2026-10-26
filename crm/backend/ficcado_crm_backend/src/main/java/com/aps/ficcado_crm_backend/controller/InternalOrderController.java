package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.InternalOrderDto.*;
import com.aps.ficcado_crm_backend.entity.Customer;
import com.aps.ficcado_crm_backend.entity.Inventory;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.entity.SaleLineItem;
import com.aps.ficcado_crm_backend.entity.enums.DeliveryStatus;
import com.aps.ficcado_crm_backend.entity.enums.FulfilmentSource;
import com.aps.ficcado_crm_backend.entity.enums.PaymentStatus;
import com.aps.ficcado_crm_backend.entity.enums.SaleStatus;
import com.aps.ficcado_crm_backend.entity.enums.ItemStatus;
import com.aps.ficcado_crm_backend.repository.CustomerRepository;
import com.aps.ficcado_crm_backend.repository.InventoryRepository;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.repository.SaleRepository;
import com.aps.ficcado_crm_backend.service.DeliveryService;
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
 * - Stock safety: Verifies inventory with row locking before deducting.
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

    private final SaleRepository saleRepository;
    private final ItemRepository itemRepository;
    private final InventoryRepository inventoryRepository;
    private final CustomerRepository customerRepository;
    private final SaleService saleService;
    private final DeliveryService deliveryService;

    @Value("${app.internal.api-key:ficcado-internal-service-secret-key-change-in-prod}")
    private String internalApiKey;

    @PostMapping(value = {"/create-paid-sale", "/website-orders"})
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

        // 2. Resolve customer details from database if customerId is present (never trust client)
        String custName = request.customerName();
        String custEmail = request.customerEmail();
        String custPhone = request.customerPhone();
        String custAddress = request.customerAddress();

        if (request.customerId() != null) {
            Optional<Customer> cOpt = customerRepository.findById(request.customerId());
            if (cOpt.isPresent()) {
                Customer c = cOpt.get();
                if (c.getCustomerName() != null && !c.getCustomerName().isBlank()) custName = c.getCustomerName();
                if (c.getEmailId() != null && !c.getEmailId().isBlank()) custEmail = c.getEmailId();
                if (c.getPhoneNumber() != null && !c.getPhoneNumber().isBlank()) custPhone = c.getPhoneNumber();
                if (c.getAddresses() != null && !c.getAddresses().isEmpty()) {
                    var matchedAddr = c.getAddresses().stream()
                            .filter(a -> a.getAddress() != null && a.getAddress().equalsIgnoreCase(request.customerAddress()))
                            .findFirst();
                    if (matchedAddr.isPresent()) {
                        custAddress = matchedAddr.get().getAddress();
                    } else if (custAddress == null || custAddress.isBlank()) {
                        var defaultAddr = c.getAddresses().stream()
                                .filter(a -> Boolean.TRUE.equals(a.getIsDefault()))
                                .findFirst();
                        if (defaultAddr.isPresent()) {
                            custAddress = defaultAddr.get().getAddress();
                        } else {
                            custAddress = c.getAddresses().get(0).getAddress();
                        }
                    }
                }
            }
        }

        // 3. Resolve Items & Validate Stock & Recompute Quote
        BigDecimal computedItemsTotal = BigDecimal.ZERO;
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
            if (item.getCurrentStatus() != ItemStatus.ACTIVE && item.getCurrentStatus() != ItemStatus.IN_STOCK) {
                log.error("Item '{}' is inactive (status={}) during sale creation", item.getItemName(), item.getCurrentStatus());
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new InternalSaleResponse(false, "Item is inactive: " + item.getItemName(), null, null, null, null, false));
            }

            // Check inventory stock using row lock
            Optional<Inventory> invOpt = inventoryRepository.findByItemIdAndSizeForUpdate(item.getId(), itemReq.size());
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

            BigDecimal unitPrice = item.getPriceOfItem() != null ? item.getPriceOfItem() : itemReq.priceEach();
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(itemReq.quantity()));
            computedItemsTotal = computedItemsTotal.add(lineTotal);

            SaleLineItem lineItem = SaleLineItem.builder()
                    .item(item)
                    .itemName(item.getItemName())
                    .size(itemReq.size())
                    .quantity(itemReq.quantity())
                    .priceEach(unitPrice)
                    .totalPrice(lineTotal)
                    .build();

            lineItems.add(lineItem);
        }

        BigDecimal deliveryCharge = request.deliveryChargeAmount() != null ? request.deliveryChargeAmount() : BigDecimal.ZERO;
        BigDecimal expectedTotal = computedItemsTotal.add(deliveryCharge);
        if (expectedTotal.compareTo(request.amount()) != 0) {
            log.error("Amount mismatch for transactionId={}: expected {}, received {}",
                    request.transactionId(), expectedTotal, request.amount());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new InternalSaleResponse(
                            false,
                            "AMOUNT_MISMATCH: Computed total " + expectedTotal + " does not match paid amount " + request.amount(),
                            null, null, null, null, false
                    ));
        }

        // 4. Generate unique invoice number: FIC-INV-[timestamp]
        String invoiceNumber = generateUniqueInvoiceNumber();

        // 5. Construct Sale entity
        boolean deliveryEnabled = deliveryCharge.compareTo(BigDecimal.ZERO) > 0;

        Sale sale = Sale.builder()
                .invoiceNumber(invoiceNumber)
                .saleStatus(SaleStatus.COMPLETED)
                .paymentStatus(PaymentStatus.PAID)
                .modeOfPayment("ONLINE_RAZORPAY")
                .transactionId(request.transactionId())
                .deliveryStatus(DeliveryStatus.PENDING)
                .customerName(custName)
                .customerEmail(custEmail)
                .customerPhoneNumber(custPhone)
                .customerAddress(custAddress)
                .deliveryChargeEnabled(deliveryEnabled)
                .deliveryChargeAmount(deliveryCharge)
                .totalAmount(request.amount())
                .fulfilmentSource(FulfilmentSource.TAKE_FROM_INVENTORY)
                .fulfilmentRequestStatus("Normal")
                .remarks("WEBSITE SALE")
                .lineItems(new ArrayList<>())
                .build();

        for (SaleLineItem li : lineItems) {
            li.setSale(sale);
            sale.getLineItems().add(li);
        }

        // 5. Delegate to SaleService.createSale with retry on invoice collision
        Sale saved = null;
        int attempts = 0;
        while (saved == null && attempts < 3) {
            attempts++;
            sale.setInvoiceNumber(generateUniqueInvoiceNumber());
            try {
                saved = saleService.createSale(sale, null);
            } catch (org.springframework.dao.DataIntegrityViolationException ex) {
                if (attempts >= 3) {
                    throw ex;
                }
                log.warn("Invoice number collision on [{}], retrying... (attempt {})", sale.getInvoiceNumber(), attempts);
                try {
                    Thread.sleep(5);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
        }

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

    @PostMapping("/quote")
    @Operation(summary = "Calculate official server-side quote with verified prices, stock availability, and delivery charges")
    @Transactional(readOnly = true)
    public ResponseEntity<?> calculateQuote(
            @RequestHeader(value = "X-Internal-Secret", required = false) String secretHeader,
            @Valid @RequestBody QuoteRequest request) {

        if (!validateSecret(secretHeader)) {
            log.warn("Unauthorized internal quote calculation attempt");
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new OrderQuoteResponse(false, "Forbidden: Invalid internal secret", List.of(), BigDecimal.ZERO, BigDecimal.ZERO, null, null, BigDecimal.ZERO));
        }

        if (request.items() == null || request.items().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new OrderQuoteResponse(false, "Quote items cannot be empty", List.of(), BigDecimal.ZERO, BigDecimal.ZERO, null, null, BigDecimal.ZERO));
        }

        boolean allAvailable = true;
        List<QuoteLineItem> lineItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (QuoteRequestItem reqItem : request.items()) {
            Optional<Item> itemOpt = itemRepository.findById(reqItem.itemId());
            if (itemOpt.isEmpty()) {
                allAvailable = false;
                lineItems.add(new QuoteLineItem(reqItem.itemId(), "Unknown Item", reqItem.size(), reqItem.quantity(), BigDecimal.ZERO, BigDecimal.ZERO, false, "Item not found in catalog"));
                continue;
            }

            Item item = itemOpt.get();
            if (item.getCurrentStatus() != ItemStatus.ACTIVE && item.getCurrentStatus() != ItemStatus.IN_STOCK) {
                allAvailable = false;
                lineItems.add(new QuoteLineItem(item.getId(), item.getItemName(), reqItem.size(), reqItem.quantity(), item.getPriceOfItem(), BigDecimal.ZERO, false, "Item is inactive"));
                continue;
            }

            Optional<Inventory> invOpt = inventoryRepository.findByItemIdAndSize(item.getId(), reqItem.size());
            int availableStock = invOpt.map(Inventory::getTotalQuantity).orElse(0);
            if (availableStock < reqItem.quantity()) {
                allAvailable = false;
                lineItems.add(new QuoteLineItem(item.getId(), item.getItemName(), reqItem.size(), reqItem.quantity(), item.getPriceOfItem(), BigDecimal.ZERO, false, "Insufficient stock. Available: " + availableStock));
                continue;
            }

            BigDecimal unitPrice = item.getPriceOfItem() != null ? item.getPriceOfItem() : BigDecimal.ZERO;
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(reqItem.quantity()));
            subtotal = subtotal.add(lineTotal);

            lineItems.add(new QuoteLineItem(item.getId(), item.getItemName(), reqItem.size(), reqItem.quantity(), unitPrice, lineTotal, true, null));
        }

        // Server-side delivery charge computation
        BigDecimal deliveryCharge = BigDecimal.ZERO;
        String courierName = "Express Surface Logistics";
        String courierId = request.courierId() != null && !request.courierId().isBlank() ? request.courierId().trim() : "del-standard";

        try {
            deliveryCharge = deliveryService.calculateDeliveryCharge(courierId);
            courierName = deliveryService.resolveCourierName(courierId);
        } catch (IllegalArgumentException e) {
            allAvailable = false;
            return ResponseEntity.badRequest().body(new OrderQuoteResponse(
                    false,
                    e.getMessage(),
                    lineItems,
                    subtotal,
                    BigDecimal.ZERO,
                    courierId,
                    null,
                    subtotal
            ));
        }

        BigDecimal totalAmount = subtotal.add(deliveryCharge);
        String message = allAvailable ? "Quote calculated successfully" : "One or more items are unavailable or out of stock";

        return ResponseEntity.ok(new OrderQuoteResponse(
                allAvailable,
                message,
                lineItems,
                subtotal,
                deliveryCharge,
                courierId,
                courierName,
                totalAmount
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
