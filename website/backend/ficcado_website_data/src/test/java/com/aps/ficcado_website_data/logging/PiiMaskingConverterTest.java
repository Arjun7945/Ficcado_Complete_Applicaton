package com.aps.ficcado_website_data.logging;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PiiMaskingConverterTest {

    @Test
    @DisplayName("Email addresses are masked preserving first 2 chars and full domain")
    void masksEmails() {
        String input = "Enquiry received from customer@ficcado.in and arjun7945@gmail.com";
        String masked = PiiMaskingConverter.mask(input);
        assertThat(masked).isEqualTo("Enquiry received from cu***@ficcado.in and ar***@gmail.com");
    }

    @Test
    @DisplayName("Phone numbers are masked preserving last 4 digits")
    void masksPhoneNumbers() {
        String input = "Customer phone +91 6282000729 or 9876543210 updated";
        String masked = PiiMaskingConverter.mask(input);
        assertThat(masked).contains("******0729");
        assertThat(masked).contains("******3210");
        assertThat(masked).doesNotContain("6282000729");
        assertThat(masked).doesNotContain("9876543210");
    }

    @Test
    @DisplayName("JWT tokens and 256-bit Session IDs are masked")
    void masksJwtAndSessionId() {
        String jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
        String sessionId = "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0";
        String input = "Session sid=" + sessionId + " token=" + jwt;
        String masked = PiiMaskingConverter.mask(input);

        assertThat(masked).contains("***[REDACTED_SESSION_ID]");
        assertThat(masked).contains("ey***[REDACTED_JWT]");
        assertThat(masked).doesNotContain(sessionId);
        assertThat(masked).doesNotContain(jwt);
    }

    @Test
    @DisplayName("JSON credentials and OTPs are masked")
    void masksJsonCredentials() {
        String input = "{\"email\":\"customer@ficcado.in\",\"otp\":\"654321\",\"password\":\"SecretPass123\"}";
        String masked = PiiMaskingConverter.mask(input);

        assertThat(masked).contains("\"otp\":\"******\"");
        assertThat(masked).contains("\"password\":\"******\"");
        assertThat(masked).doesNotContain("654321");
        assertThat(masked).doesNotContain("SecretPass123");
    }

    @Test
    @DisplayName("Clean non-PII log messages pass through unchanged")
    void preservesCleanLogs() {
        String clean = "Wishlist item added successfully for itemId=42";
        assertThat(PiiMaskingConverter.mask(clean)).isEqualTo(clean);
    }
}
