package com.aps.ficcado_payment_gateway_data.service;

import com.aps.ficcado_payment_gateway_data.dto.PaymentDto.OrderStatusEvent;
import com.aps.ficcado_payment_gateway_data.entity.OutboxEvent;
import com.aps.ficcado_payment_gateway_data.entity.PaymentStatus;
import com.aps.ficcado_payment_gateway_data.entity.PaymentTransaction;
import com.aps.ficcado_payment_gateway_data.repository.OutboxEventRepository;
import com.aps.ficcado_payment_gateway_data.repository.PaymentTransactionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Service-to-Service Synchronization Client.
 * Bridges verified payments from Ficcado-Payment-Gateway-Data to Ficcado-Data (Port 8081).
 * Uses constant-time verified X-Internal-Secret and handles idempotency, stock deductions, and refund triggers.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FiccadoDataSyncService {

    private final PaymentTransactionRepository transactionRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.ficcado-data.url:http://localhost:8081}")
    private String ficcadoDataUrl;

    @Value("${app.ficcado-data.internal-secret:ficcado-internal-service-secret-key-change-in-prod}")
    private String internalSecret;

    public enum SyncResultType {
        SUCCESS,
        BUSINESS_FAILURE,
        TRANSIENT_FAILURE
    }

    public record SyncOutcome(SyncResultType type, String message) {}

    public record InternalSaleResult(
            boolean success,
            String message,
            Long saleId,
            String invoiceNumber,
            BigDecimal totalAmount,
            String status,
            boolean isDuplicate
    ) {}

    /**
     * Synchronizes a verified transaction to Ficcado-Data to generate an official Sale and deduct stock.
     */
    @Transactional
    public boolean syncSaleToFiccadoData(PaymentTransaction inputTx) {
        return executeSyncSale(inputTx).type() == SyncResultType.SUCCESS;
    }

    /**
     * Detailed execution returning exact failure classification (business vs transient) for reconciliation.
     */
    @Transactional
    public SyncOutcome executeSyncSale(PaymentTransaction inputTx) {
        PaymentTransaction tx = transactionRepository.findById(inputTx.getId()).orElse(inputTx);
        if ("COMPLETED".equals(tx.getPaymentStatus()) || "SYNCED_TO_FICCADO_DATA".equals(tx.getSyncStatus())) {
            log.info("Transaction {} already synchronized to Ficcado-Data with invoice {}",
                    tx.getTransactionId(), tx.getFiccadoInvoiceNumber());
            return new SyncOutcome(SyncResultType.SUCCESS, "Already synchronized");
        }

        try {
            List<Map<String, Object>> items = objectMapper.readValue(
                    tx.getOrderItemsJson(),
                    new TypeReference<>() {}
            );

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("transactionId", tx.getRazorpayPaymentId() != null ? tx.getRazorpayPaymentId() : tx.getTransactionId());
            payload.put("razorpayOrderId", tx.getRazorpayOrderId());
            payload.put("amount", tx.getAmount());
            payload.put("customerId", tx.getCustomerId() != null ? tx.getCustomerId() : 0L);
            payload.put("customerName", tx.getCustomerName());
            payload.put("customerEmail", tx.getCustomerEmail());
            payload.put("customerPhone", tx.getCustomerPhone());
            payload.put("customerAddress", tx.getShippingAddress());
            payload.put("deliveryChargeAmount", tx.getDeliveryCharge() != null ? tx.getDeliveryCharge() : BigDecimal.ZERO);
            payload.put("courierPartner", tx.getCourierPartner() != null ? tx.getCourierPartner() : "Shiprocket");
            payload.put("lineItems", items);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Secret", internalSecret);
            String correlationId = org.slf4j.MDC.get("correlationId");
            if (correlationId != null && !correlationId.isBlank()) {
                headers.set("X-Correlation-Id", correlationId);
            }

            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);
            String url = ficcadoDataUrl + "/api/internal/orders/website-orders";

            log.info("Sending internal sale synchronization request to {} for transaction {}", url, tx.getTransactionId());
            ResponseEntity<InternalSaleResult> response = restTemplate.postForEntity(url, requestEntity, InternalSaleResult.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                InternalSaleResult result = response.getBody();
                tx.transitionTo(PaymentStatus.COMPLETED, null);
                tx.setSyncStatus("SYNCED_TO_FICCADO_DATA");
                tx.setFiccadoInvoiceNumber(result.invoiceNumber());
                tx.setFiccadoSaleId(result.saleId());
                transactionRepository.save(tx);

                saveOutboxEvent(tx, "COMPLETED", null);

                log.info("Successfully synchronized payment to Ficcado-Data. Invoice: {}, Sale ID: {}",
                        result.invoiceNumber(), result.saleId());
                return new SyncOutcome(SyncResultType.SUCCESS, "Synchronized with invoice " + result.invoiceNumber());
            }

        } catch (HttpClientErrorException.Conflict conflictEx) {
            // Business failure: item inactive, stock exhausted, or price mismatch!
            log.error("Business failure during sale synchronization for transaction {}: {}",
                    tx.getTransactionId(), conflictEx.getResponseBodyAsString());
            tx.transitionTo(PaymentStatus.REFUND_PENDING, conflictEx.getResponseBodyAsString());
            tx.setSyncStatus("FAILED_OUT_OF_STOCK");
            transactionRepository.save(tx);

            saveOutboxEvent(tx, "REFUND_PENDING", conflictEx.getResponseBodyAsString());

            log.warn("AUTOMATED REFUND FLAGGED for paymentId={}, customer={}",
                    tx.getRazorpayPaymentId(), tx.getCustomerEmail());
            return new SyncOutcome(SyncResultType.BUSINESS_FAILURE, conflictEx.getResponseBodyAsString());

        } catch (HttpClientErrorException.BadRequest badReqEx) {
            // Business failure: invalid payload or missing item!
            log.error("Bad request during sale synchronization for transaction {}: {}",
                    tx.getTransactionId(), badReqEx.getResponseBodyAsString());
            tx.transitionTo(PaymentStatus.REFUND_PENDING, badReqEx.getResponseBodyAsString());
            tx.setSyncStatus("FAILED_BAD_REQUEST");
            transactionRepository.save(tx);

            saveOutboxEvent(tx, "REFUND_PENDING", badReqEx.getResponseBodyAsString());
            return new SyncOutcome(SyncResultType.BUSINESS_FAILURE, badReqEx.getResponseBodyAsString());

        } catch (HttpServerErrorException | ResourceAccessException transientEx) {
            // Transient failure: 5xx, network timeout, connection refused
            log.warn("Transient failure synchronizing transaction {} to Ficcado-Data (will remain in PROCESSING for retry): {}",
                    tx.getTransactionId(), transientEx.getMessage());
            tx.setSyncStatus("RETRY_QUEUED");
            tx.setFailureReason("Transient error: " + transientEx.getMessage());
            transactionRepository.save(tx);
            return new SyncOutcome(SyncResultType.TRANSIENT_FAILURE, transientEx.getMessage());

        } catch (Exception ex) {
            log.error("Unexpected error during sale synchronization for transaction {}: {}",
                    tx.getTransactionId(), ex.getMessage(), ex);
            tx.setSyncStatus("RETRY_QUEUED");
            tx.setFailureReason(ex.getMessage());
            transactionRepository.save(tx);
            return new SyncOutcome(SyncResultType.TRANSIENT_FAILURE, ex.getMessage());
        }

        return new SyncOutcome(SyncResultType.TRANSIENT_FAILURE, "Unknown sync failure");
    }

    public void saveOutboxEvent(PaymentTransaction tx, String status, String reason) {
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
            log.info("Saved outbox event [type=order-status, status={}, aggregateId={}]",
                    status, tx.getTransactionId());
        } catch (Exception e) {
            log.error("Failed to write outbox event: {}", e.getMessage());
        }
    }
}
