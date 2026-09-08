package com.aps.ficcado_inventory_sales_management_app.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum FulfilmentSource {
    TAKE_FROM_INVENTORY,
    WAREHOUSE_HANDLER;

    @JsonCreator
    public static FulfilmentSource fromString(String value) {
        if (value == null || value.isBlank()) return TAKE_FROM_INVENTORY;
        String normalized = value.trim().toUpperCase()
                .replace(" ", "_")
                .replace("-", "_")
                .replaceAll("_+", "_");

        for (FulfilmentSource s : values()) {
            if (s.name().equalsIgnoreCase(normalized) || s.name().equalsIgnoreCase(value.trim())) {
                return s;
            }
        }
        if (normalized.contains("WAREHOUSE") || normalized.contains("HANDLER")) return WAREHOUSE_HANDLER;
        return TAKE_FROM_INVENTORY;
    }
}
