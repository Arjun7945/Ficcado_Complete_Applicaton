package com.aps.ficcado_inventory_sales_management_app.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

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

        for (RefundStatus status : values()) {
            if (status.name().equalsIgnoreCase(normalized) || status.name().equalsIgnoreCase(value.trim())) {
                return status;
            }
        }
        if (normalized.contains("APPROV")) return APPROVED;
        if (normalized.contains("COMPLET")) return COMPLETED;
        if (normalized.contains("PROGRESS")) return IN_PROGRESS;
        if (normalized.contains("REJECT")) return REJECTED;
        if (normalized.contains("CLOSE")) return CLOSED;
        return PENDING;
    }
}
