package com.aps.ficcado_crm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;
import java.util.Optional;

public enum PaymentStatus {
    PAID,
    UNPAID,
    NOT_PAID,
    CREDIT,
    PARTIALLY_PAID;

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static PaymentStatus fromString(String value) {
        if (value == null || value.isBlank()) return NOT_PAID;
        String normalized = value.trim().toUpperCase()
                .replace(" ", "_")
                .replace("-", "_")
                .replaceAll("_+", "_");

        Optional<PaymentStatus> exact = Arrays.stream(values())
                .filter(status -> status.name().equalsIgnoreCase(normalized) || status.name().equalsIgnoreCase(value.trim()))
                .findFirst();
        if (exact.isPresent()) {
            return exact.get();
        }
        if (normalized.contains("PARTIAL")) return PARTIALLY_PAID;
        if (normalized.contains("CREDIT")) return CREDIT;
        if (normalized.contains("NOT") || normalized.contains("UNPAID")) return NOT_PAID;
        if (normalized.contains("PAID")) return PAID;
        return NOT_PAID;
    }
}
