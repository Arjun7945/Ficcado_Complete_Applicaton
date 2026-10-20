package com.aps.ficcado_crm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;
import java.util.Optional;

public enum ItemVerificationStatus {
    GOOD_ACCEPTED_FOR_RETURN,
    DAMAGED_CANNOT_ACCEPT_RETURN,
    NOT_RECEIVED_IN_TRANSIT,
    PENDING,
    VERIFIED,
    REJECTED;

    @JsonCreator
    public static ItemVerificationStatus fromString(String value) {
        if (value == null || value.isBlank()) return PENDING;
        String normalized = value.trim().toUpperCase()
                .replace(" ", "_")
                .replace("-", "_")
                .replace("/", "_")
                .replaceAll("_+", "_");

        Optional<ItemVerificationStatus> exact = Arrays.stream(values())
                .filter(status -> status.name().equalsIgnoreCase(normalized) || status.name().equalsIgnoreCase(value.trim()))
                .findFirst();
        if (exact.isPresent()) {
            return exact.get();
        }
        if (normalized.contains("GOOD") || normalized.contains("ACCEPT")) return GOOD_ACCEPTED_FOR_RETURN;
        if (normalized.contains("DAMAGE") || normalized.contains("CANNOT")) return DAMAGED_CANNOT_ACCEPT_RETURN;
        if (normalized.contains("NOT_RECEIVED") || normalized.contains("TRANSIT")) return NOT_RECEIVED_IN_TRANSIT;
        if (normalized.contains("VERIFIED")) return VERIFIED;
        if (normalized.contains("REJECT")) return REJECTED;
        return PENDING;
    }
}
