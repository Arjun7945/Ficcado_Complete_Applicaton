package com.aps.ficcado_crm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;
import java.util.Optional;

public enum RefundStatus {
    PENDING,
    IN_PROGRESS,
    APPROVED,
    COMPLETED,
    REJECTED,
    CLOSED;

    @JsonCreator
    public static RefundStatus fromString(String value) {
        if (value == null || value.isBlank()) return PENDING;
        String normalized = value.trim().toUpperCase()
                .replace(" ", "_")
                .replace("-", "_")
                .replaceAll("_+", "_");

        Optional<RefundStatus> exact = Arrays.stream(values())
                .filter(status -> status.name().equalsIgnoreCase(normalized) || status.name().equalsIgnoreCase(value.trim()))
                .findFirst();
        if (exact.isPresent()) {
            return exact.get();
        }
        if (normalized.contains("APPROV")) return APPROVED;
        if (normalized.contains("COMPLET")) return COMPLETED;
        if (normalized.contains("PROGRESS")) return IN_PROGRESS;
        if (normalized.contains("REJECT")) return REJECTED;
        if (normalized.contains("CLOSE")) return CLOSED;
        return PENDING;
    }
}
