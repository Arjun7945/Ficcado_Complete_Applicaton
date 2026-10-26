package com.aps.ficcado_payment_gateway_data.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.pattern.CompositeConverter;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Logback CompositeConverter that masks PII, credentials, and secrets in log messages.
 * Implemented per Decision AUD-13 for Ficcado-Payment-Gateway-Data.
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

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "\\b([a-zA-Z0-9_.+-]{1,2})[a-zA-Z0-9_.+-]*(@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+)\\b"
    );

    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(?:\\+?91[\\s-]?)?(?:\\b[6-9]\\d{2})[\\s-]?\\d{3}[\\s-]?(\\d{4})\\b"
    );

    private static final Pattern AUTH_HEADER_PATTERN = Pattern.compile(
            "(?i)(Authorization:\\s*Bearer\\s+)[a-zA-Z0-9_.-]+"
    );

    private static final Pattern COOKIE_SESSION_PATTERN = Pattern.compile(
            "(?i)(ficcado_customer_session=)[^;\\s]+"
    );

    private static final Pattern JWT_PATTERN = Pattern.compile(
            "\\bey[a-zA-Z0-9_-]{10,}\\.[a-zA-Z0-9_-]{10,}\\.[a-zA-Z0-9_-]{10,}\\b"
    );

    private static final Pattern SESSION_ID_PATTERN = Pattern.compile(
            "\\b[a-fA-F0-9]{64}\\b"
    );

    private static final Pattern JSON_CREDENTIAL_PATTERN = Pattern.compile(
            "(?i)(\"(?:password|newPassword|confirmPassword|pwd|otp|code|pin|secret)\"\\s*:\\s*\")[^\"]+(\")"
    );

    private static final Pattern KV_CREDENTIAL_PATTERN = Pattern.compile(
            "(?i)(\\b(?:password|newPassword|confirmPassword|pwd|otp|code|pin|secret)\\s*[=:]\\s*)[^\\s,;&\\]]+"
    );

    private static final Pattern RAZORPAY_KEY_PATTERN = Pattern.compile(
            "\\brzp_(?:test|live)_[a-zA-Z0-9]{10,}\\b"
    );

    private static final Pattern RAZORPAY_SECRET_PATTERN = Pattern.compile(
            "(?i)(\\b(?:razorpay[_\s]?(?:secret|signature|key)|payment[_\s]?signature)\\s*[=:]\\s*)[^\\s,;&\\]]+"
    );

    @Override
    protected String transform(ILoggingEvent event, String in) {
        return mask(in);
    }

    public static String mask(String message) {
        if (message == null || message.isEmpty()) {
            return message;
        }

        String result = message;

        if (result.contains("\"password") || result.contains("\"otp") || result.contains("\"secret")
                || result.contains("\"code") || result.contains("\"pwd") || result.contains("\"pin")) {
            result = JSON_CREDENTIAL_PATTERN.matcher(result).replaceAll("$1******$2");
        }

        Matcher kvMatcher = KV_CREDENTIAL_PATTERN.matcher(result);
        if (kvMatcher.find()) {
            result = kvMatcher.replaceAll("$1******");
        }

        if (result.toLowerCase().contains("authorization:") || result.toLowerCase().contains("ficcado_customer_session")) {
            result = AUTH_HEADER_PATTERN.matcher(result).replaceAll("$1[REDACTED_TOKEN]");
            result = COOKIE_SESSION_PATTERN.matcher(result).replaceAll("$1[REDACTED_SESSION]");
        }

        if (result.contains("ey")) {
            result = JWT_PATTERN.matcher(result).replaceAll("ey***[REDACTED_JWT]");
        }

        Matcher sessionMatcher = SESSION_ID_PATTERN.matcher(result);
        if (sessionMatcher.find()) {
            result = sessionMatcher.replaceAll("***[REDACTED_SESSION_ID]");
        }

        if (result.contains("rzp_") || result.toLowerCase().contains("razorpay")) {
            result = RAZORPAY_KEY_PATTERN.matcher(result).replaceAll("rzp_***[REDACTED_KEY]");
            result = RAZORPAY_SECRET_PATTERN.matcher(result).replaceAll("$1[REDACTED_SECRET]");
        }

        if (result.contains("@")) {
            result = EMAIL_PATTERN.matcher(result).replaceAll("$1***$2");
        }

        Matcher phoneMatcher = PHONE_PATTERN.matcher(result);
        if (phoneMatcher.find()) {
            result = phoneMatcher.replaceAll("******$1");
        }

        return result;
    }
}
