package com.aps.ficcado_crm_backend.util;

import java.util.regex.Pattern;

/**
 * Normalizes Indian mobile phone numbers to the canonical 10-digit national format (^[6-9]\d{9}$).
 *
 * Rules:
 * 1. Remove spaces, hyphens, dots, and parentheses.
 * 2. If it starts with '+91' and has 13 characters, or starts with '91' and has 12 digits, remove the prefix.
 * 3. If it starts with '0' and has 11 digits, remove the leading '0'.
 * 4. The canonical format is the 10-digit national number.
 */
public final class PhoneNormalizer {

    private static final Pattern CLEAN_PATTERN = Pattern.compile("[\\s\\-\\.\\(\\)]");
    private static final Pattern INDIAN_PHONE_PATTERN = Pattern.compile("^[6-9]\\d{9}$");
    private static final Pattern DIGITS_ONLY = Pattern.compile("^\\d+$");

    private PhoneNormalizer() {}

    /**
     * Normalizes a raw phone string according to Ficcado canonical rules.
     * If the input is null or blank, returns empty string.
     */
    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }

        // 1. Remove spaces, hyphens, dots, and parentheses
        String cleaned = CLEAN_PATTERN.matcher(raw.trim()).replaceAll("");

        // 2. If starts with '+91' and has 13 characters, or starts with '91' and has 12 digits, remove prefix
        if (cleaned.startsWith("+91") && cleaned.length() == 13) {
            cleaned = cleaned.substring(3);
        } else if (cleaned.startsWith("91") && cleaned.length() == 12 && DIGITS_ONLY.matcher(cleaned).matches()) {
            cleaned = cleaned.substring(2);
        }

        // 3. If starts with '0' and has 11 digits, remove the leading '0'
        if (cleaned.startsWith("0") && cleaned.length() == 11 && DIGITS_ONLY.matcher(cleaned).matches()) {
            cleaned = cleaned.substring(1);
        }

        return cleaned;
    }

    /**
     * Returns true if the phone string, once normalized, matches a valid 10-digit Indian mobile number (^[6-9]\d{9}$).
     */
    public static boolean isValidIndianPhone(String raw) {
        String normalized = normalize(raw);
        return INDIAN_PHONE_PATTERN.matcher(normalized).matches();
    }
}
