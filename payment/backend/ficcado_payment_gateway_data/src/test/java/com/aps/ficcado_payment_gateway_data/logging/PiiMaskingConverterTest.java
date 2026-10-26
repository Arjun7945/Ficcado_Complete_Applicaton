package com.aps.ficcado_payment_gateway_data.logging;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PiiMaskingConverterTest {

    @Test
    @DisplayName("AUD-13 / P2-9: Masks email preserving first 2 chars and domain")
    void masksEmail() {
        String log = "Customer email: customer@example.com logged in";
        String masked = PiiMaskingConverter.mask(log);
        assertThat(masked).isEqualTo("Customer email: cu***@example.com logged in");
    }

    @Test
    @DisplayName("AUD-13 / P2-9: Masks 10-digit Indian phone numbers preserving last 4 digits")
    void masksPhone() {
        String log = "SMS dispatched to +91 9876543210 for order OTP";
        String masked = PiiMaskingConverter.mask(log);
        assertThat(masked).isEqualTo("SMS dispatched to ******3210 for order OTP");
    }

    @Test
    @DisplayName("AUD-13 / P2-9: Masks Authorization Bearer headers")
    void masksAuthHeader() {
        String log = "Incoming request with Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature";
        String masked = PiiMaskingConverter.mask(log);
        assertThat(masked).doesNotContain("doNotLeakThisSignature");
        assertThat(masked).contains("[REDACTED_TOKEN]");
    }

    @Test
    @DisplayName("AUD-13 / P2-9: Masks 256-bit session IDs")
    void masksSessionId() {
        String sessionId = "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0";
        String log = "Active session validated: " + sessionId;
        String masked = PiiMaskingConverter.mask(log);
        assertThat(masked).doesNotContain(sessionId);
        assertThat(masked).contains("***[REDACTED_SESSION_ID]");
    }

    @Test
    @DisplayName("AUD-13 / P2-9: Masks JSON passwords and OTPs")
    void masksJsonSecrets() {
        String log = "Payload received: {\"email\":\"admin@ficcado.com\",\"password\":\"SuperSecret123!\",\"otp\":\"654321\"}";
        String masked = PiiMaskingConverter.mask(log);
        assertThat(masked).doesNotContain("SuperSecret123!");
        assertThat(masked).doesNotContain("654321");
        assertThat(masked).contains("\"password\":\"******\"");
        assertThat(masked).contains("\"otp\":\"******\"");
    }

    @Test
    @DisplayName("AUD-13 / P2-9: Masks Razorpay API keys and secrets")
    void masksRazorpayKeysAndSecrets() {
        String log = "Calling Razorpay with key rzp_test_ficcado12345 and razorpay_signature: sig_secret_999999999";
        String masked = PiiMaskingConverter.mask(log);
        assertThat(masked).doesNotContain("rzp_test_ficcado12345");
        assertThat(masked).doesNotContain("sig_secret_999999999");
        assertThat(masked).contains("rzp_***[REDACTED_KEY]");
        assertThat(masked).contains("[REDACTED_SECRET]");
    }
}
