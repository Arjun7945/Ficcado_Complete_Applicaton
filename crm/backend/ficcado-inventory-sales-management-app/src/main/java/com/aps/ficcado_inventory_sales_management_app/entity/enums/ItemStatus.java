package com.aps.ficcado_inventory_sales_management_app.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum ItemStatus {
    ACTIVE,
    INACTIVE,
    IN_STOCK,
    OUT_OF_STOCK,
    DISCONTINUED;

    @JsonCreator
    public static ItemStatus fromString(String value) {
        if (value == null || value.isBlank()) return ACTIVE;
        String normalized = value.trim().toUpperCase()
                .replace(" ", "_")
                .replace("-", "_")
                .replaceAll("_+", "_");

        for (ItemStatus status : values()) {
            if (status.name().equalsIgnoreCase(normalized) || status.name().equalsIgnoreCase(value.trim())) {
                return status;
            }
        }
        if (normalized.contains("IN_STOCK")) return IN_STOCK;
        if (normalized.contains("OUT_OF_STOCK") || normalized.contains("OUT")) return OUT_OF_STOCK;
        if (normalized.contains("INACTIVE") || normalized.contains("DISCONTINU")) return INACTIVE;
        return ACTIVE;
    }
}
