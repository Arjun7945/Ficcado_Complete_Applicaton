package com.aps.ficcado_crm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;
import java.util.Optional;

public enum PaymentMode {
    CASH,
    UPI,
    CARD,
    BANK_TRANSFER;

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static PaymentMode fromString(String value) {
        if (value == null || value.isBlank()) return CASH;
        String normalized = value.trim().toUpperCase()
                .replace(" ", "_")
                .replace("-", "_")
                .replaceAll("_+", "_");

        Optional<PaymentMode> exact = Arrays.stream(values())
                .filter(mode -> mode.name().equalsIgnoreCase(normalized) || mode.name().equalsIgnoreCase(value.trim()))
                .findFirst();
        if (exact.isPresent()) {
            return exact.get();
        }
        if (normalized.contains("UPI")) return UPI;
        if (normalized.contains("CARD")) return CARD;
        if (normalized.contains("BANK") || normalized.contains("TRANSFER")) return BANK_TRANSFER;
        return CASH;
    }
}
