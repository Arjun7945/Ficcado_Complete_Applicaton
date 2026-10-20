package com.aps.ficcado_crm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;
import java.util.Optional;

public enum ReplacementStatus {
    REPLACEMENT_APPROVED,
    REPLACEMENT_DISPATCHED,
    REPLACEMENT_RECEIVED,
    SATISFIED_AND_COMPLETED,
    APPROVED,
    DISPATCHED,
    RECEIVED;

    @JsonCreator
    public static ReplacementStatus fromString(String value) {
        if (value == null || value.isBlank()) return REPLACEMENT_APPROVED;
        String normalized = value.trim().toUpperCase()
                .replace(" ", "_")
                .replace("/", "_")
                .replaceAll("_+", "_");

        Optional<ReplacementStatus> exact = Arrays.stream(values())
                .filter(status -> status.name().equalsIgnoreCase(normalized) || status.name().equalsIgnoreCase(value.trim()))
                .findFirst();
        if (exact.isPresent()) {
            return exact.get();
        }
        if (normalized.contains("DISPATCH")) return REPLACEMENT_DISPATCHED;
        if (normalized.contains("RECEIV")) return REPLACEMENT_RECEIVED;
        if (normalized.contains("SATISFIED") || normalized.contains("COMPLET")) return SATISFIED_AND_COMPLETED;
        if (normalized.contains("APPROV")) return REPLACEMENT_APPROVED;
        return REPLACEMENT_APPROVED;
    }
}
