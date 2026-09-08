package com.aps.ficcado_inventory_sales_management_app.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum DispositionOfItems {
    RETURNED_TO_INVENTORY,
    SENT_TO_DAMAGED_PRODUCTS,
    RETURN_TO_STOCK,
    SEND_TO_DAMAGED_LOG;

    @JsonCreator
    public static DispositionOfItems fromString(String value) {
        if (value == null || value.isBlank()) return RETURNED_TO_INVENTORY;
        String normalized = value.trim().toUpperCase()
                .replace(" ", "_")
                .replace("/", "_")
                .replaceAll("_+", "_");

        for (DispositionOfItems d : values()) {
            if (d.name().equalsIgnoreCase(normalized) || d.name().equalsIgnoreCase(value.trim())) {
                return d;
            }
        }
        if (normalized.contains("DAMAG")) return SENT_TO_DAMAGED_PRODUCTS;
        return RETURNED_TO_INVENTORY;
    }
}
