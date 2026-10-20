package com.aps.ficcado_payment_gateway_data.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Razorpay cryptographic integration service.
 * Handles HMAC-SHA256 signature verification for client payment tokens and incoming webhooks.
 * Generates Razorpay order references and enforces constant-time security checks.
 */
@Slf4j
@Service
public class RazorpayService {

    @Value("${app.razorpay.key-id}")
    private String keyId;

    @Value("${app.razorpay.key-secret}")
    private String keySecret;

    @Value("${app.razorpay.webhook-secret}")
    private String webhookSecret;

    public String getKeyId() {
        return keyId;
    }

    /**
     * Creates or generates a Razorpay Order ID.
     * In live production, this can invoke Razorpay HTTP API.
     * For local development and test reliability, generates a deterministic, unique order reference.
     */
    public String createOrder(BigDecimal amount, String currency, String receipt) {
        long amountInPaise = amount.multiply(BigDecimal.valueOf(100)).longValue();
        String orderId = "order_fic_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        log.info("Created Razorpay order [orderId={}, amountInPaise={}, receipt={}]",
                orderId, amountInPaise, receipt);
        return orderId;
    }

    /**
     * Verifies client-side Razorpay payment signature.
     * signature = HmacSHA256(order_id + "|" + payment_id, secret)
     */
    public boolean verifyPaymentSignature(String orderId, String paymentId, String signature) {
        if (orderId == null || paymentId == null || signature == null) {
            return false;
        }

        try {
            String payload = orderId + "|" + paymentId;
            String expectedSignature = calculateHmacSha256(payload, keySecret);
            boolean valid = constantTimeEquals(expectedSignature, signature);
            if (!valid) {
                log.warn("Invalid Razorpay payment signature for orderId={}, paymentId={}", orderId, paymentId);
            }
            return valid;
        } catch (Exception e) {
            log.error("Error verifying Razorpay payment signature: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Verifies Razorpay webhook payload signature.
     * signature = HmacSHA256(raw_payload, webhook_secret)
     */
    public boolean verifyWebhookSignature(String rawPayload, String signature) {
        if (rawPayload == null || signature == null) {
            return false;
        }

        try {
            String expectedSignature = calculateHmacSha256(rawPayload, webhookSecret);
            return constantTimeEquals(expectedSignature, signature);
        } catch (Exception e) {
            log.error("Error verifying Razorpay webhook signature: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Calculates HMAC-SHA256 hash as lower-case hexadecimal string.
     */
    public String calculateHmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate HMAC-SHA256 signature", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
        byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(aBytes, bBytes);
    }
}
