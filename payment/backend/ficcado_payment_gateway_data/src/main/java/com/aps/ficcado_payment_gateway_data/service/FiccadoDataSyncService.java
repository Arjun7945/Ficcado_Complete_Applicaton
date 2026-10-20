package com.aps.ficcado_payment_gateway_data.service;

import com.aps.ficcado_payment_gateway_data.entity.PaymentTransaction;
import com.aps.ficcado_payment_gateway_data.repository.PaymentTransactionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
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
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.ficcado-data.url:http://localhost:8081}")
    private String ficcadoDataUrl;

    @Value("${app.ficcado-data.internal-secret:ficcado-internal-service-secret-key-change-in-prod}")
    private String internalSecret;

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
    public boolean syncSaleToFiccadoData(PaymentTransaction tx) {
        if ("SYNCED_TO_FICCADO_DATA".equals(tx.getSyncStatus())) {
            log.info("Transaction {} already synchronized to Ficcado-Data with invoice {}",
                    tx.getTransactionId(), tx.getFiccadoInvoiceNumber());
            return true;
        }

        try {
            List<Map<String, Object>> items = objectMapper.readValue(
                    tx.getOrderItemsJson(),
                    new TypeReference<>() {}
            );

            Map<String, Object> payload = Map.of(
                    "transactionId", tx.getRazorpayPaymentId() != null ? tx.getRazorpayPaymentId() : tx.getTransactionId(),
                    "razorpayOrderId", tx.getRazorpayOrderId(),
                    "amount", tx.getAmount(),
                    "customerName", tx.getCustomerName(),
                    "customerEmail", tx.getCustomerEmail(),
                    "customerPhone", tx.getCustomerPhone(),
                    "customerAddress", tx.getShippingAddress(),
                    "deliveryChargeAmount", BigDecimal.ZERO,
                    "lineItems", items
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Secret", internalSecret);

            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);
            String url = ficcadoDataUrl + "/api/internal/orders/create-paid-sale";

            log.info("Sending internal sale synchronization request to {} for transaction {}", url, tx.getTransactionId());
            ResponseEntity<InternalSaleResult> response = restTemplate.postForEntity(url, requestEntity, InternalSaleResult.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                InternalSaleResult result = response.getBody();
                tx.setSyncStatus("SYNCED_TO_FICCADO_DATA");
                tx.setPaymentStatus("CAPTURED");
                tx.setFiccadoInvoiceNumber(result.invoiceNumber());
                tx.setFiccadoSaleId(result.saleId());
                transactionRepository.save(tx);
                log.info("Successfully synchronized payment to Ficcado-Data. Invoice: {}, Sale ID: {}",
                        result.invoiceNumber(), result.saleId());
                return true;
            }

        } catch (HttpClientErrorException.Conflict conflictEx) {
            // Stock was exhausted between checkout and payment capture!
            log.error("Out of stock during sale synchronization for transaction {}: {}",
                    tx.getTransactionId(), conflictEx.getResponseBodyAsString());
            tx.setSyncStatus("FAILED_OUT_OF_STOCK");
            tx.setPaymentStatus("REFUND_REQUESTED");
            tx.setFailureReason("Items ran out of stock before order synchronization: " + conflictEx.getResponseBodyAsString());
            transactionRepository.save(tx);
            // In live integration, this triggers Razorpay refund API: razorpay.payments.refund(paymentId)
            log.warn("AUTOMATED REFUND FLAGGED for paymentId={}, customer={}",
                    tx.getRazorpayPaymentId(), tx.getCustomerEmail());
            return false;

        } catch (Exception ex) {
            log.error("Failed to synchronize transaction {} to Ficcado-Data: {}",
                    tx.getTransactionId(), ex.getMessage());
            tx.setSyncStatus("RETRY_QUEUED");
            tx.setFailureReason(ex.getMessage());
            transactionRepository.save(tx);
            return false;
        }

        return false;
    }
}
