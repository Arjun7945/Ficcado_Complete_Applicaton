package com.aps.ficcado_inventory_sales_management_app.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

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

        for (PaymentStatus status : values()) {
            if (status.name().equalsIgnoreCase(normalized) || status.name().equalsIgnoreCase(value.trim())) {
                return status;
            }
        }
        if (normalized.contains("PARTIAL")) return PARTIALLY_PAID;
        if (normalized.contains("CREDIT")) return CREDIT;
        if (normalized.contains("NOT") || normalized.contains("UNPAID")) return NOT_PAID;
        if (normalized.contains("PAID")) return PAID;
        return NOT_PAID;
    }
}
