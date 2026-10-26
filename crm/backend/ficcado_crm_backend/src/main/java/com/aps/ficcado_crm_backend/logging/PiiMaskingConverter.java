package com.aps.ficcado_crm_backend.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.pattern.CompositeConverter;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Logback CompositeConverter that masks PII, credentials, and secrets in log messages.
 * Implemented per Decision AUD-13.
 *
 * Masks:
 * 1. Emails: ab***@gmail.com (preserves first 2 chars and full domain)
 * 2. Phone numbers: ******1234 (preserves last 4 digits)
 * 3. JWT Tokens: ey***[REDACTED_JWT]
 * 4. 256-bit Session IDs (64-char hex strings): ***[REDACTED_SESSION_ID]
 * 5. Passwords, OTPs, PINs in JSON or key-value format: ******
 * 6. Authorization & Cookie headers: [REDACTED]
 * 7. Razorpay Keys, Secrets, and Signatures: [REDACTED]
 */
public class PiiMaskingConverter extends CompositeConverter<ILoggingEvent> {

    // 1. Email pattern: e.g. arjun7945@gmail.com -> ar***@gmail.com
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "\\b([a-zA-Z0-9_.+-]{1,2})[a-zA-Z0-9_.+-]*(@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+)\\b"
    );

    // 2. Phone number pattern: e.g. +91 6282000729 or 9876543210 -> ******0729 / ******3210
    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(?:\\+?91[\\s-]?)?(?:\\b[6-9]\\d{2})[\\s-]?\\d{3}[\\s-]?(\\d{4})\\b"
    );

    // 3. Authorization Bearer header: Authorization: Bearer <token>
    private static final Pattern AUTH_HEADER_PATTERN = Pattern.compile(
            "(?i)(Authorization:\\s*Bearer\\s+)[a-zA-Z0-9_.-]+"
    );

    // 4. Cookie session header: ficcado_customer_session=<token>
    private static final Pattern COOKIE_SESSION_PATTERN = Pattern.compile(
            "(?i)(ficcado_customer_session=)[^;\\s]+"
    );

    // 5. JWT token pattern: eyJ...
    private static final Pattern JWT_PATTERN = Pattern.compile(
            "\\bey[a-zA-Z0-9_-]{10,}\\.[a-zA-Z0-9_-]{10,}\\.[a-zA-Z0-9_-]{10,}\\b"
    );

    // 6. Session ID pattern: 64 hex characters (256-bit SecureRandom hex string)
    private static final Pattern SESSION_ID_PATTERN = Pattern.compile(
            "\\b[a-fA-F0-9]{64}\\b"
    );

    // 7. Passwords and OTPs in JSON fields: "password": "value" or "otp": "123456"
    private static final Pattern JSON_CREDENTIAL_PATTERN = Pattern.compile(
            "(?i)(\"(?:password|newPassword|confirmPassword|pwd|otp|code|pin|secret)\"\\s*:\\s*\")[^\"]+(\")"
    );

    // 8. Passwords and OTPs in Key-Value text: password=value or otp: 123456
    private static final Pattern KV_CREDENTIAL_PATTERN = Pattern.compile(
            "(?i)(\\b(?:password|newPassword|confirmPassword|pwd|otp|code|pin|secret)\\s*[=:]\\s*)[^\\s,;&\\]]+"
    );

    // 9. Razorpay API Keys: rzp_test_... or rzp_live_...
    private static final Pattern RAZORPAY_KEY_PATTERN = Pattern.compile(
            "\\brzp_(?:test|live)_[a-zA-Z0-9]{10,}\\b"
    );

    // 10. Razorpay Secrets & Signatures: razorpay_signature=... or razorpay_secret=...
    private static final Pattern RAZORPAY_SECRET_PATTERN = Pattern.compile(
            "(?i)(\\b(?:razorpay[_\s]?(?:secret|signature|key)|payment[_\s]?signature)\\s*[=:]\\s*)[^\\s,;&\\]]+"
    );

    @Override
    protected String transform(ILoggingEvent event, String in) {
        return mask(in);
    }

    /**
     * Applies all precompiled masking patterns to the input string.
     * Safe against null inputs and optimized for minimal allocation on non-matching strings.
     */
    public static String mask(String message) {
        if (message == null || message.isEmpty()) {
            return message;
        }

        String result = message;

        // 1. Mask JSON credentials first (passwords, OTPs, secrets)
        if (result.contains("\"password") || result.contains("\"otp") || result.contains("\"secret")
                || result.contains("\"code") || result.contains("\"pwd") || result.contains("\"pin")) {
            result = JSON_CREDENTIAL_PATTERN.matcher(result).replaceAll("$1******$2");
        }

        // 2. Mask Key-Value credentials
        Matcher kvMatcher = KV_CREDENTIAL_PATTERN.matcher(result);
        if (kvMatcher.find()) {
            result = kvMatcher.replaceAll("$1******");
        }

        // 3. Mask Authorization & Cookie headers
        if (result.toLowerCase().contains("authorization:") || result.toLowerCase().contains("ficcado_customer_session")) {
            result = AUTH_HEADER_PATTERN.matcher(result).replaceAll("$1[REDACTED_TOKEN]");
            result = COOKIE_SESSION_PATTERN.matcher(result).replaceAll("$1[REDACTED_SESSION]");
        }

        // 4. Mask JWT tokens
        if (result.contains("ey")) {
            result = JWT_PATTERN.matcher(result).replaceAll("ey***[REDACTED_JWT]");
        }

        // 5. Mask 256-bit Session IDs (64-character hex strings)
        Matcher sessionMatcher = SESSION_ID_PATTERN.matcher(result);
        if (sessionMatcher.find()) {
            result = sessionMatcher.replaceAll("***[REDACTED_SESSION_ID]");
        }

        // 6. Mask Razorpay keys & secrets
        if (result.contains("rzp_") || result.toLowerCase().contains("razorpay")) {
            result = RAZORPAY_KEY_PATTERN.matcher(result).replaceAll("rzp_***[REDACTED_KEY]");
            result = RAZORPAY_SECRET_PATTERN.matcher(result).replaceAll("$1[REDACTED_SECRET]");
        }

        // 7. Mask Emails
        if (result.contains("@")) {
            result = EMAIL_PATTERN.matcher(result).replaceAll("$1***$2");
        }

        // 8. Mask Phone numbers
        Matcher phoneMatcher = PHONE_PATTERN.matcher(result);
        if (phoneMatcher.find()) {
            result = phoneMatcher.replaceAll("******$1");
        }

        return result;
    }
}
