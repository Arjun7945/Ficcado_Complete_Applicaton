package com.aps.ficcado_inventory_sales_management_app.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

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

        for (ItemVerificationStatus status : values()) {
            if (status.name().equalsIgnoreCase(normalized) || status.name().equalsIgnoreCase(value.trim())) {
                return status;
            }
        }
        if (normalized.contains("GOOD") || normalized.contains("ACCEPT")) return GOOD_ACCEPTED_FOR_RETURN;
        if (normalized.contains("DAMAGE") || normalized.contains("CANNOT")) return DAMAGED_CANNOT_ACCEPT_RETURN;
        if (normalized.contains("NOT_RECEIVED") || normalized.contains("TRANSIT")) return NOT_RECEIVED_IN_TRANSIT;
        if (normalized.contains("VERIFIED")) return VERIFIED;
        if (normalized.contains("REJECT")) return REJECTED;
        return PENDING;
    }
}
