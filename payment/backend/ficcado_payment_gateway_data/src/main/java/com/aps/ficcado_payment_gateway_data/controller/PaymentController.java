package com.aps.ficcado_payment_gateway_data.controller;

import com.aps.ficcado_payment_gateway_data.dto.PaymentDto.*;
import com.aps.ficcado_payment_gateway_data.entity.PaymentTransaction;
import com.aps.ficcado_payment_gateway_data.repository.PaymentTransactionRepository;
import com.aps.ficcado_payment_gateway_data.service.FiccadoDataSyncService;
import com.aps.ficcado_payment_gateway_data.service.RazorpayService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentTransactionRepository transactionRepository;
    private final RazorpayService razorpayService;
    private final FiccadoDataSyncService syncService;
    private final ObjectMapper objectMapper;

    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        log.info("REST request to create payment order for customer {} (amount: {})",
                request.customerEmail(), request.amount());

        // Validate items and compute amount defensively
        BigDecimal computedItemsTotal = request.items().stream()
                .map(item -> item.priceEach().multiply(BigDecimal.valueOf(item.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal deliveryCharge = request.deliveryCharge() != null ? request.deliveryCharge() : BigDecimal.ZERO;
        BigDecimal expectedTotal = computedItemsTotal.add(deliveryCharge);

        if (expectedTotal.compareTo(request.amount()) != 0) {
            log.warn("Mismatch between requested amount {} and computed total {}",
                    request.amount(), expectedTotal);
        }

        String transactionId = "FIC-TXN-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8);
        String razorpayOrderId = razorpayService.createOrder(request.amount(), "INR", transactionId);

        try {
            String itemsJson = objectMapper.writeValueAsString(request.items());
            PaymentTransaction transaction = PaymentTransaction.builder()
                    .transactionId(transactionId)
                    .razorpayOrderId(razorpayOrderId)
                    .customerId(request.customerId())
                    .customerName(request.customerName())
                    .customerEmail(request.customerEmail())
                    .customerPhone(request.customerPhone())
                    .shippingAddress(request.shippingAddress())
                    .amount(request.amount())
                    .currency("INR")
                    .paymentStatus("CREATED")
                    .syncStatus("PENDING")
                    .orderItemsJson(itemsJson)
                    .build();

            transactionRepository.save(transaction);

            long amountInPaise = request.amount().multiply(BigDecimal.valueOf(100)).longValue();
            CreateOrderResponse response = new CreateOrderResponse(
                    true,
                    razorpayOrderId,
                    transactionId,
                    request.amount(),
                    amountInPaise,
                    "INR",
                    razorpayService.getKeyId(),
                    request.customerName(),
                    request.customerEmail(),
                    request.customerPhone()
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {
            log.error("Failed to serialize order items: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to initialize payment transaction: " + e.getMessage());
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
        tx.setPaymentStatus("AUTHORIZED");
        transactionRepository.save(tx);

        // Synchronize with Ficcado-Data to deduct inventory and create official Sale
        boolean synced = syncService.syncSaleToFiccadoData(tx);

        // Reload updated transaction
        tx = transactionRepository.findById(tx.getId()).orElse(tx);

        return ResponseEntity.ok(new VerifyPaymentResponse(
                true,
                true,
                synced ? "Payment verified and order confirmed successfully" : "Payment verified; inventory synchronization: " + tx.getSyncStatus(),
                tx.getFiccadoInvoiceNumber(),
                tx.getFiccadoSaleId(),
                tx.getTransactionId(),
                tx.getSyncStatus()
        ));
    }

    @GetMapping("/status/{identifier}")
    public ResponseEntity<PaymentStatusResponse> getStatus(@PathVariable String identifier) {
        Optional<PaymentTransaction> txOpt = transactionRepository.findByTransactionId(identifier)
                .or(() -> transactionRepository.findByRazorpayOrderId(identifier))
                .or(() -> transactionRepository.findByRazorpayPaymentId(identifier));

        if (txOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        PaymentTransaction tx = txOpt.get();
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
                tx.getCreatedAt() != null ? tx.getCreatedAt().toString() : null
        );

        return ResponseEntity.ok(response);
    }
}
