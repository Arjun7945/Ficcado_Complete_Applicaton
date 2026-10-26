package com.aps.ficcado_crm_backend.logging;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PiiMaskingConverterTest {

    @Test
    @DisplayName("Email: masks email addresses preserving first 2 characters and domain")
    void testEmailMasking() {
        assertThat(PiiMaskingConverter.mask("User logged in with email: arjun7945@gmail.com"))
                .isEqualTo("User logged in with email: ar***@gmail.com");

        assertThat(PiiMaskingConverter.mask("Customer email a@ficcado.in registered"))
                .isEqualTo("Customer email a***@ficcado.in registered");

        assertThat(PiiMaskingConverter.mask("Two emails: first.user@example.com and second@test.org"))
                .isEqualTo("Two emails: fi***@example.com and se***@test.org");
    }

    @Test
    @DisplayName("Phone: masks 10-digit phone numbers preserving only last 4 digits")
    void testPhoneMasking() {
        assertThat(PiiMaskingConverter.mask("Customer phone: 6282000729 verified"))
                .isEqualTo("Customer phone: ******0729 verified");

        assertThat(PiiMaskingConverter.mask("Dispatch notification to +91 9876543210"))
                .isEqualTo("Dispatch notification to ******3210");

        assertThat(PiiMaskingConverter.mask("Contact 987-654-3210 for delivery"))
                .isEqualTo("Contact ******3210 for delivery");
    }

    @Test
    @DisplayName("JWT: masks JWT tokens in log messages")
    void testJwtMasking() {
        String token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
        assertThat(PiiMaskingConverter.mask("Authorization token issued: " + token))
                .isEqualTo("Authorization token issued: ey***[REDACTED_JWT]");
    }

    @Test
    @DisplayName("Session ID: masks 256-bit (64-character hex) session IDs")
    void testSessionIdMasking() {
        String sessionId = "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0";
        assertThat(PiiMaskingConverter.mask("Created Redis session [sessionId=" + sessionId + "]"))
                .isEqualTo("Created Redis session [sessionId=***[REDACTED_SESSION_ID]]");
    }

    @Test
    @DisplayName("Headers: masks Authorization Bearer and Cookie session headers")
    void testHeadersMasking() {
        assertThat(PiiMaskingConverter.mask("Request header: Authorization: Bearer secret-token-xyz"))
                .isEqualTo("Request header: Authorization: Bearer [REDACTED_TOKEN]");

        assertThat(PiiMaskingConverter.mask("Cookie received: ficcado_customer_session=abc123secret; path=/"))
                .isEqualTo("Cookie received: ficcado_customer_session=[REDACTED_SESSION]; path=/");
    }

    @Test
    @DisplayName("Passwords & OTPs: masks passwords and OTP codes in JSON and key-value formats")
    void testCredentialsMasking() {
        // JSON format
        assertThat(PiiMaskingConverter.mask("{\"email\":\"user@test.com\",\"password\":\"SuperSecret123!\"}"))
                .isEqualTo("{\"email\":\"us***@test.com\",\"password\":\"******\"}");

        assertThat(PiiMaskingConverter.mask("{\"email\":\"user@test.com\",\"otp\":\"654321\"}"))
                .isEqualTo("{\"email\":\"us***@test.com\",\"otp\":\"******\"}");

        // Key-Value format
        assertThat(PiiMaskingConverter.mask("Login request [email=customer@test.com, password=myPassword456]"))
                .isEqualTo("Login request [email=cu***@test.com, password=******]");

        assertThat(PiiMaskingConverter.mask("OTP verification failed for otp: 123456"))
                .isEqualTo("OTP verification failed for otp: ******");
    }

    @Test
    @DisplayName("Razorpay: masks Razorpay API keys, secrets, and signatures")
    void testRazorpayMasking() {
        assertThat(PiiMaskingConverter.mask("Init payment with key rzp_test_abcdef12345678"))
                .isEqualTo("Init payment with key rzp_***[REDACTED_KEY]");

        assertThat(PiiMaskingConverter.mask("Payment verified razorpay_signature=9f8e7d6c5b4a3210fedcba"))
                .isEqualTo("Payment verified razorpay_signature=[REDACTED_SECRET]");

        assertThat(PiiMaskingConverter.mask("Webhooks config razorpay_secret: super_secret_razorpay_key"))
                .isEqualTo("Webhooks config razorpay_secret: [REDACTED_SECRET]");
    }

    @Test
    @DisplayName("Edge cases: handles null, empty, and non-sensitive strings without alterations")
    void testEdgeCases() {
        assertThat(PiiMaskingConverter.mask(null)).isNull();
        assertThat(PiiMaskingConverter.mask("")).isEmpty();
        assertThat(PiiMaskingConverter.mask("Standard system status: All 5 containers healthy on port 8000"))
                .isEqualTo("Standard system status: All 5 containers healthy on port 8000");
    }
}
