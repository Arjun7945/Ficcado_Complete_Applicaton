package com.aps.ficcado_payment_gateway_data;

import com.aps.ficcado_payment_gateway_data.service.RazorpayService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class RazorpayServiceTest {

    @Autowired
    private RazorpayService razorpayService;

    @Test
    @DisplayName("createOrder generates valid order reference")
    void createOrderGeneratesValidId() {
        String orderId = razorpayService.createOrder(BigDecimal.valueOf(1499), "INR", "receipt_1");
        assertNotNull(orderId);
        assertTrue(orderId.startsWith("order_fic_"));
    }

    @Test
    @DisplayName("verifyPaymentSignature returns true for valid HMAC-SHA256 signature and false for tampered")
    void verifiesPaymentSignature() {
        String orderId = "order_test_12345";
        String paymentId = "pay_test_67890";
        String secret = "rzp_test_mock_secret";

        String validSignature = razorpayService.calculateHmacSha256(orderId + "|" + paymentId, secret);

        assertTrue(razorpayService.verifyPaymentSignature(orderId, paymentId, validSignature));
        assertFalse(razorpayService.verifyPaymentSignature(orderId, paymentId, "invalid_signature"));
        assertFalse(razorpayService.verifyPaymentSignature(orderId, "tampered_pay", validSignature));
    }

    @Test
    @DisplayName("verifyWebhookSignature returns true for authentic payload and false for tampered")
    void verifiesWebhookSignature() {
        String payload = "{\"event\":\"payment.captured\",\"id\":\"evt_123\"}";
        String secret = "rzp_test_webhook_secret";

        String validSignature = razorpayService.calculateHmacSha256(payload, secret);

        assertTrue(razorpayService.verifyWebhookSignature(payload, validSignature));
        assertFalse(razorpayService.verifyWebhookSignature(payload, "invalid_webhook_sig"));
        assertFalse(razorpayService.verifyWebhookSignature(payload + "tampered", validSignature));
    }
}
