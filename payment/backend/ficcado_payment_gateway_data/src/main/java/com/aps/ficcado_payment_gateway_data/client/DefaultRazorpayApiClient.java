package com.aps.ficcado_payment_gateway_data.client;

import com.aps.ficcado_payment_gateway_data.dto.RazorpayPaymentItem;
import com.aps.ficcado_payment_gateway_data.dto.RazorpayRefundResult;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Default HTTP implementation of RazorpayApiClient.
 * Connects to Razorpay REST API with timeouts and circuit breaker protection.
 */
@Slf4j
@Component
public class DefaultRazorpayApiClient implements RazorpayApiClient {

    private final String keyId;
    private final String keySecret;
    private final String baseUrl;
    private final RestTemplate restTemplate;
    private final CircuitBreaker circuitBreaker;
    private final ObjectMapper objectMapper;

    public DefaultRazorpayApiClient(
            @Value("${app.razorpay.key-id}") String keyId,
            @Value("${app.razorpay.key-secret}") String keySecret,
            @Value("${app.razorpay.base-url:https://api.razorpay.com/v1}") String baseUrl,
            @Value("${app.reconciliation.circuit-breaker.failure-threshold:5}") int failureThreshold,
            @Value("${app.reconciliation.circuit-breaker.open-duration-ms:30000}") long openDurationMs,
            @Value("${app.razorpay.connect-timeout-ms:5000}") int connectTimeoutMs,
            @Value("${app.razorpay.read-timeout-ms:5000}") int readTimeoutMs,
            ObjectMapper objectMapper
    ) {
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.baseUrl = baseUrl;
        this.objectMapper = objectMapper;
        this.circuitBreaker = new CircuitBreaker(failureThreshold, openDurationMs);

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        this.restTemplate = new RestTemplate(factory);
    }

    @Override
    public CircuitBreaker getCircuitBreaker() {
        return this.circuitBreaker;
    }

    @Override
    public void resetCircuitBreaker() {
        this.circuitBreaker.reset();
    }

    private HttpHeaders createAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String auth = keyId + ":" + keySecret;
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
        headers.set("Authorization", "Basic " + encodedAuth);
        return headers;
    }

    @Override
    public List<RazorpayPaymentItem> fetchPaymentsForOrder(String razorpayOrderId) {
        if (!circuitBreaker.allowExecution()) {
            throw new CircuitBreakerOpenException("Circuit breaker is OPEN. Razorpay API call blocked.");
        }

        try {
            String url = baseUrl + "/orders/" + razorpayOrderId + "/payments";
            HttpEntity<Void> entity = new HttpEntity<>(createAuthHeaders());

            log.info("Fetching Razorpay payments for order: {}", razorpayOrderId);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                circuitBreaker.recordSuccess();
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode itemsNode = root.get("items");
                if (itemsNode != null && itemsNode.isArray()) {
                    return objectMapper.convertValue(itemsNode, new TypeReference<List<RazorpayPaymentItem>>() {});
                }
                return Collections.emptyList();
            }

            circuitBreaker.recordFailure();
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("Failed to fetch Razorpay payments for order {}: {}", razorpayOrderId, e.getMessage());
            circuitBreaker.recordFailure();
            throw new RuntimeException("Failed to fetch payments from Razorpay: " + e.getMessage(), e);
        }
    }

    @Override
    public RazorpayRefundResult initiateRefund(String paymentId, BigDecimal amount, String note) {
        if (!circuitBreaker.allowExecution()) {
            throw new CircuitBreakerOpenException("Circuit breaker is OPEN. Razorpay refund call blocked.");
        }

        try {
            String url = baseUrl + "/payments/" + paymentId + "/refund";
            long amountInPaise = amount.multiply(BigDecimal.valueOf(100)).longValue();

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("amount", amountInPaise);
            payload.put("reverse_all", 1);
            if (note != null && !note.isBlank()) {
                payload.put("notes", Map.of("reason", note));
            }

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, createAuthHeaders());

            log.info("Initiating Razorpay refund for payment {}: amountPaise={}, reason={}",
                    paymentId, amountInPaise, note);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                circuitBreaker.recordSuccess();
                return objectMapper.readValue(response.getBody(), RazorpayRefundResult.class);
            }

            circuitBreaker.recordFailure();
            throw new RuntimeException("Failed to initiate refund: HTTP status " + response.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to initiate Razorpay refund for payment {}: {}", paymentId, e.getMessage());
            circuitBreaker.recordFailure();
            throw new RuntimeException("Failed to initiate refund: " + e.getMessage(), e);
        }
    }

    @Override
    public String fetchRefundStatus(String refundId) {
        if (!circuitBreaker.allowExecution()) {
            throw new CircuitBreakerOpenException("Circuit breaker is OPEN. Razorpay refund inquiry blocked.");
        }

        try {
            String url = baseUrl + "/refunds/" + refundId;
            HttpEntity<Void> entity = new HttpEntity<>(createAuthHeaders());

            log.info("Fetching Razorpay refund status for refund: {}", refundId);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                circuitBreaker.recordSuccess();
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode statusNode = root.get("status");
                return statusNode != null ? statusNode.asText() : "pending";
            }

            circuitBreaker.recordFailure();
            return "pending";
        } catch (Exception e) {
            log.error("Failed to fetch refund status for {}: {}", refundId, e.getMessage());
            circuitBreaker.recordFailure();
            throw new RuntimeException("Failed to fetch refund status: " + e.getMessage(), e);
        }
    }
}
