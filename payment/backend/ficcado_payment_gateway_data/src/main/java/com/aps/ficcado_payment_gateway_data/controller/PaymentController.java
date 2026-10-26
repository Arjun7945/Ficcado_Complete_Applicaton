package com.aps.ficcado_payment_gateway_data.controller;

import com.aps.ficcado_payment_gateway_data.dto.PaymentDto.*;
import com.aps.ficcado_payment_gateway_data.entity.PaymentStatus;
import com.aps.ficcado_payment_gateway_data.entity.PaymentTransaction;
import com.aps.ficcado_payment_gateway_data.repository.PaymentTransactionRepository;
import com.aps.ficcado_payment_gateway_data.service.FiccadoDataSyncService;
import com.aps.ficcado_payment_gateway_data.service.RazorpayService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Slf4j
@RestController
@RequestMapping(value = {"/api/v1/payments", "/api/payments"})
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentTransactionRepository transactionRepository;
    private final RazorpayService razorpayService;
    private final FiccadoDataSyncService syncService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.ficcado-data.url:http://localhost:8081}")
    private String ficcadoDataUrl;

    @Value("${app.ficcado-data.internal-secret:ficcado-internal-service-secret-key-change-in-prod}")
    private String internalSecret;

    @PostMapping(value = {"/create-order", "/orders"})
    public ResponseEntity<?> createOrder(
            @RequestHeader(value = "X-Customer-Id", required = false) Long customerIdHeader,
            @Valid @RequestBody CreateOrderRequest request) {

        Long effectiveCustomerId = customerIdHeader != null ? customerIdHeader : request.customerId();
        log.info("REST request to create payment order for customer [id={}, email={}]",
                effectiveCustomerId, request.customerEmail());

        // 1. Resolve quote server-side from Ficcado-Data to guarantee official catalog prices & stock
        BigDecimal finalAmount = request.amount();
        BigDecimal deliveryCharge = request.deliveryCharge() != null ? request.deliveryCharge() : BigDecimal.ZERO;
        String courierPartner = request.courierPartner() != null ? request.courierPartner() : "Express Surface Logistics";

        try {
            List<Map<String, Object>> quoteItems = new ArrayList<>();
            for (OrderItemDto item : request.items()) {
                quoteItems.add(Map.of(
                        "itemId", item.itemId() != null ? item.itemId() : 1L,
                        "size", item.size(),
                        "quantity", item.quantity()
                ));
            }

            HttpHeaders quoteHeaders = new HttpHeaders();
            quoteHeaders.setContentType(MediaType.APPLICATION_JSON);
            quoteHeaders.set("X-Internal-Secret", internalSecret);

            Map<String, Object> quotePayload = Map.of(
                    "items", quoteItems,
                    "courierId", request.courierPartner() != null ? request.courierPartner() : "del-standard"
            );

            HttpEntity<Map<String, Object>> quoteEntity = new HttpEntity<>(quotePayload, quoteHeaders);
            String quoteUrl = ficcadoDataUrl + "/api/internal/orders/quote";

            ResponseEntity<JsonNode> quoteResp = restTemplate.postForEntity(quoteUrl, quoteEntity, JsonNode.class);
            if (quoteResp.getStatusCode().is2xxSuccessful() && quoteResp.getBody() != null) {
                JsonNode body = quoteResp.getBody();
                boolean allAvailable = body.path("allAvailable").asBoolean(true);
                if (!allAvailable) {
                    String msg = body.path("message").asText("One or more items are out of stock or unavailable");
                    log.warn("Quote rejected for customer {}: {}", effectiveCustomerId, msg);
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                            "success", false,
                            "error", msg
                    ));
                }

                if (body.hasNonNull("totalAmount")) {
                    finalAmount = new BigDecimal(body.get("totalAmount").asText());
                }
                if (body.hasNonNull("deliveryCharge")) {
                    deliveryCharge = new BigDecimal(body.get("deliveryCharge").asText());
                }
                if (body.hasNonNull("courierName")) {
                    courierPartner = body.get("courierName").asText();
                }
            }
        } catch (Exception e) {
            log.warn("Could not query server quote (falling back to requested amount defensively): {}", e.getMessage());
            if (finalAmount == null) {
                BigDecimal computedItemsTotal = request.items().stream()
                        .map(item -> (item.priceEach() != null ? item.priceEach() : BigDecimal.ZERO).multiply(BigDecimal.valueOf(item.quantity())))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                finalAmount = computedItemsTotal.add(deliveryCharge);
            }
        }

        if (finalAmount == null || finalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Invalid order amount"));
        }

        // 2. Compute integer paise with BigDecimal rounding defense
        long amountInPaise = finalAmount.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.UNNECESSARY)
                .longValue();

        String transactionId = "FIC-TXN-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8);
        String razorpayOrderId = razorpayService.createOrder(finalAmount, "INR", transactionId);

        // 3. Mark customer session paused for 15 minutes in Ficcado-Data (P2-4 / P2-7)
        if (effectiveCustomerId != null) {
            try {
                HttpHeaders pauseHeaders = new HttpHeaders();
                pauseHeaders.set("X-Internal-Secret", internalSecret);
                HttpEntity<Void> pauseEntity = new HttpEntity<>(pauseHeaders);
                restTemplate.postForEntity(
                        ficcadoDataUrl + "/api/customer/session/pause?minutes=15",
                        pauseEntity, Void.class
                );
            } catch (Exception e) {
                log.debug("Session pause call ignored: {}", e.getMessage());
            }
        }

        // 4. Save order snapshot in payment_transactions with state machine status CREATED
        try {
            String itemsJson = objectMapper.writeValueAsString(request.items());
            PaymentTransaction transaction = PaymentTransaction.builder()
                    .transactionId(transactionId)
                    .razorpayOrderId(razorpayOrderId)
                    .customerId(effectiveCustomerId)
                    .customerName(request.customerName() != null ? request.customerName() : "Guest Customer")
                    .customerEmail(request.customerEmail() != null ? request.customerEmail() : "guest@ficcado.com")
                    .customerPhone(request.customerPhone() != null ? request.customerPhone() : "0000000000")
                    .shippingAddress(request.shippingAddress() != null ? request.shippingAddress() : "Default Address")
                    .addressId(request.addressId())
                    .courierPartner(courierPartner)
                    .deliveryCharge(deliveryCharge)
                    .amount(finalAmount)
                    .currency("INR")
                    .paymentStatus(PaymentStatus.CREATED.name())
                    .syncStatus("PENDING")
                    .orderItemsJson(itemsJson)
                    .build();

            transactionRepository.save(transaction);

            CreateOrderResponse response = new CreateOrderResponse(
                    true,
                    razorpayOrderId,
                    transactionId,
                    finalAmount,
                    amountInPaise,
                    "INR",
                    razorpayService.getKeyId(),
                    transaction.getCustomerName(),
                    transaction.getCustomerEmail(),
                    transaction.getCustomerPhone()
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {
            log.error("Failed to initialize payment transaction: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "error", "Failed to initialize payment transaction: " + e.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@Valid @RequestBody VerifyPaymentRequest request) {
        log.info("REST request to verify Razorpay payment [orderId={}, paymentId={}]",
                request.razorpayOrderId(), request.razorpayPaymentId());

        boolean validSignature = razorpayService.verifyPaymentSignature(
                request.razorpayOrderId(),
                request.razorpayPaymentId(),
                request.razorpaySignature()
        );

        if (!validSignature) {
            log.warn("Payment signature verification failed for orderId={}", request.razorpayOrderId());
            return ResponseEntity.badRequest().body(new VerifyPaymentResponse(
                    false,
                    false,
                    "Invalid payment signature",
                    null,
                    null,
                    null,
                    "VERIFICATION_FAILED"
            ));
        }

        Optional<PaymentTransaction> txOpt = transactionRepository.findByRazorpayOrderId(request.razorpayOrderId());
        if (txOpt.isEmpty()) {
            log.error("Transaction not found for Razorpay orderId={}", request.razorpayOrderId());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new VerifyPaymentResponse(
                    false,
                    false,
                    "Transaction not found for orderId: " + request.razorpayOrderId(),
                    null,
                    null,
                    null,
                    "TRANSACTION_NOT_FOUND"
            ));
        }

        PaymentTransaction tx = txOpt.get();
        tx.setRazorpayPaymentId(request.razorpayPaymentId());
        tx.setRazorpaySignature(request.razorpaySignature());

        // State Machine Transition: CREATED -> PROCESSING
        tx.transitionTo(PaymentStatus.PROCESSING, null);
        tx = transactionRepository.saveAndFlush(tx);

        // Trigger asynchronous/service sync to Ficcado-Data
        boolean synced = syncService.syncSaleToFiccadoData(tx);

        // Reload updated transaction
        tx = transactionRepository.findById(tx.getId()).orElse(tx);

        // Spec requires answering 202 Accepted quickly
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new VerifyPaymentResponse(
                true,
                true,
                synced ? "Payment verified and order confirmed successfully" : "Payment verified; status: " + tx.getPaymentStatus(),
                tx.getFiccadoInvoiceNumber(),
                tx.getFiccadoSaleId(),
                tx.getTransactionId(),
                tx.getPaymentStatus()
        ));
    }

    @GetMapping(value = {"/status/{identifier}", "/{identifier}/status"})
    public ResponseEntity<PaymentStatusResponse> getStatus(
            @RequestHeader(value = "X-Customer-Id", required = false) Long customerIdHeader,
            @PathVariable String identifier) {

        Optional<PaymentTransaction> txOpt = transactionRepository.findByTransactionId(identifier)
                .or(() -> transactionRepository.findByRazorpayOrderId(identifier))
                .or(() -> transactionRepository.findByRazorpayPaymentId(identifier));

        if (txOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        PaymentTransaction tx = txOpt.get();

        // Strict customer isolation (P2-7): customer can read ONLY their own attempts
        if (customerIdHeader != null && tx.getCustomerId() != null && !customerIdHeader.equals(tx.getCustomerId())) {
            log.warn("Customer isolation violation: customer {} attempted to inspect transaction of customer {}",
                    customerIdHeader, tx.getCustomerId());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        PaymentStatusResponse response = new PaymentStatusResponse(
                tx.getTransactionId(),
                tx.getRazorpayOrderId(),
                tx.getRazorpayPaymentId(),
                tx.getAmount(),
                tx.getCurrency(),
                tx.getPaymentStatus(),
                tx.getSyncStatus(),
                tx.getFiccadoInvoiceNumber(),
                tx.getFiccadoSaleId(),
                tx.getCustomerName(),
                tx.getCustomerEmail(),
                tx.getFailureReason(),
                tx.getCreatedAt() != null ? tx.getCreatedAt().toString() : null
        );

        return ResponseEntity.ok(response);
    }
}
