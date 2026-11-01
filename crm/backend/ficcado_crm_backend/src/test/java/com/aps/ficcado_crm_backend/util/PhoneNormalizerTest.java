package com.aps.ficcado_crm_backend.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class PhoneNormalizerTest {

    @ParameterizedTest(name = "Valid input: {0}")
    @ValueSource(strings = {
            "+91 98765 43210",
            "98765-43210",
            "09876543210",
            "(98765) 43210",
            "9876543210",
            "+919876543210"
    })
    @DisplayName("Should normalize valid Indian mobile formats to canonical 10-digit number")
    void normalize_validInputs_returnCanonicalTenDigits(String input) {
        String normalized = PhoneNormalizer.normalize(input);
        assertEquals("9876543210", normalized, "Failed for: " + input);
        assertTrue(PhoneNormalizer.isValidIndianPhone(input), "Validation failed for: " + input);
    }

    @ParameterizedTest(name = "Invalid input: {0}")
    @ValueSource(strings = {
            "12345",
            "5987654321",
            "+91 98765 4321",
            "98765abcde"
    })
    @DisplayName("Should reject invalid formats")
    void normalize_invalidInputs_failValidation(String input) {
        assertFalse(PhoneNormalizer.isValidIndianPhone(input), "Should be invalid: " + input);
    }

    @Test
    @DisplayName("Null or blank input handling")
    void normalize_nullOrBlank_returnsEmpty() {
        assertEquals("", PhoneNormalizer.normalize(null));
        assertEquals("", PhoneNormalizer.normalize("   "));
        assertFalse(PhoneNormalizer.isValidIndianPhone(null));
        assertFalse(PhoneNormalizer.isValidIndianPhone(""));
    }
}
