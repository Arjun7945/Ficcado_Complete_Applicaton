package com.aps.ficcado_payment_gateway_data.controller;

import com.aps.ficcado_payment_gateway_data.dto.PaymentDto.OrderStatusEvent;
import com.aps.ficcado_payment_gateway_data.entity.OutboxEvent;
import com.aps.ficcado_payment_gateway_data.entity.PaymentStatus;
import com.aps.ficcado_payment_gateway_data.entity.PaymentTransaction;
import com.aps.ficcado_payment_gateway_data.entity.WebhookLog;
import com.aps.ficcado_payment_gateway_data.repository.OutboxEventRepository;
import com.aps.ficcado_payment_gateway_data.repository.PaymentTransactionRepository;
import com.aps.ficcado_payment_gateway_data.repository.WebhookLogRepository;
import com.aps.ficcado_payment_gateway_data.service.FiccadoDataSyncService;
import com.aps.ficcado_payment_gateway_data.service.RazorpayService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping(value = {"/api/v1/webhooks/razorpay", "/api/payments/webhook"})
@RequiredArgsConstructor
public class RazorpayWebhookController {

    private final RazorpayService razorpayService;
    private final WebhookLogRepository webhookLogRepository;
    private final PaymentTransactionRepository transactionRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final FiccadoDataSyncService syncService;
    private final ObjectMapper objectMapper;

    @PostMapping
    @Transactional
    public ResponseEntity<?> handleRazorpayWebhook(
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature,
            @RequestBody String rawPayload) {

        log.info("Received Razorpay webhook event");

        if (signature == null || !razorpayService.verifyWebhookSignature(rawPayload, signature)) {
            log.warn("Invalid Razorpay webhook signature");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid webhook signature"));
        }

        try {
            JsonNode root = objectMapper.readTree(rawPayload);
            String eventId = root.hasNonNull("event_id")
                    ? root.get("event_id").asText()
                    : (root.hasNonNull("id") ? root.get("id").asText() : "evt_" + System.currentTimeMillis());
            String eventType = root.hasNonNull("event") ? root.get("event").asText() : "unknown";

            // 1. Idempotency Check: Drop if already processed
            if (webhookLogRepository.existsByEventId(eventId)) {
                log.info("Duplicate webhook event [{}] ignored", eventId);
                return ResponseEntity.ok(Map.of("status", "already_processed", "eventId", eventId));
            }

            // Extract payment and order entities
            JsonNode payloadObj = root.path("payload");
            JsonNode paymentEntity = payloadObj.path("payment").path("entity");
            JsonNode orderEntity = payloadObj.path("order").path("entity");

            String paymentId = paymentEntity.hasNonNull("id") ? paymentEntity.get("id").asText() : null;
            String orderId = paymentEntity.hasNonNull("order_id")
                    ? paymentEntity.get("order_id").asText()
                    : (orderEntity.hasNonNull("id") ? orderEntity.get("id").asText() : null);

            // Log webhook event
            WebhookLog webhookLog = WebhookLog.builder()
                    .eventId(eventId)
                    .eventType(eventType)
                    .razorpayPaymentId(paymentId)
                    .razorpayOrderId(orderId)
                    .payload(rawPayload)
                    .processed(true)
                    .build();
            webhookLogRepository.save(webhookLog);

            // 2. Process event actions
            if (orderId != null) {
                Optional<PaymentTransaction> txOpt = transactionRepository.findByRazorpayOrderId(orderId);
                if (txOpt.isPresent()) {
                    PaymentTransaction tx = txOpt.get();
                    tx.setWebhookEventsCount(tx.getWebhookEventsCount() + 1);

                    switch (eventType) {
                        case "payment.captured", "order.paid" -> {
                            if (paymentId != null) tx.setRazorpayPaymentId(paymentId);
                            tx.transitionTo(PaymentStatus.PROCESSING, null);
                            transactionRepository.save(tx);
                            syncService.syncSaleToFiccadoData(tx);
                        }
                        case "payment.failed" -> {
                            String reason = paymentEntity.hasNonNull("error_description")
                                    ? paymentEntity.get("error_description").asText()
                                    : "Payment failed at gateway";
                            tx.transitionTo(PaymentStatus.FAILED, reason);
                            transactionRepository.save(tx);
                            saveOutboxEvent(tx, "FAILED", reason);
                            log.warn("Payment failed for orderId={}: {} (Zero writes to Ficcado-Data)", orderId, reason);
                        }
                        case "refund.processed" -> {
                            tx.transitionTo(PaymentStatus.REFUNDED, "Refund processed by gateway");
                            transactionRepository.save(tx);
                            saveOutboxEvent(tx, "REFUNDED", null);
                            log.info("Refund processed for orderId={}", orderId);
                        }
                        default -> log.info("Unhandled webhook event type: {}", eventType);
                    }
                }
            }

            return ResponseEntity.ok(Map.of("status", "success", "eventId", eventId));

        } catch (Exception e) {
            log.error("Error processing Razorpay webhook: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Webhook processing failed: " + e.getMessage()));
        }
    }

    private void saveOutboxEvent(PaymentTransaction tx, String status, String reason) {
        try {
            OrderStatusEvent event = new OrderStatusEvent(
                    "ORDER_STATUS_CHANGED",
                    tx.getTransactionId(),
                    tx.getRazorpayOrderId(),
                    status,
                    tx.getFiccadoInvoiceNumber(),
                    tx.getFiccadoSaleId(),
                    tx.getCustomerEmail(),
                    tx.getCustomerName(),
                    tx.getAmount(),
                    reason
            );

            OutboxEvent outbox = OutboxEvent.builder()
                    .eventType("order-status")
                    .aggregateId(tx.getTransactionId())
                    .payload(objectMapper.writeValueAsString(event))
                    .status("PENDING")
                    .build();

            outboxEventRepository.save(outbox);
        } catch (Exception e) {
            log.error("Failed to save webhook outbox event: {}", e.getMessage());
        }
    }
}

