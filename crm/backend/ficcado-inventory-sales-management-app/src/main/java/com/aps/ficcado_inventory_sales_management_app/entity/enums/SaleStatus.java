package com.aps.ficcado_inventory_sales_management_app.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum SaleStatus {
    COMPLETED,
    REPLACE_REQUESTED,
    REFUND_REQUESTED,
    PURCHASE_SATISFIED_AND_ORDER_COMPLETED,
    NOT_PROVIDED_OR_ORDER_ONLY_PLACED,
    RETURN_REFUND_ON_SPECIFIC_ITEMS,
    RETURN_REFUND_ON_ALL_ITEMS,
    REPLACEMENT_COMPLETED_AND_PURCHASE_SATISFIED;

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static SaleStatus fromString(String value) {
        if (value == null || value.isBlank()) {
            return NOT_PROVIDED_OR_ORDER_ONLY_PLACED;
        }
        String normalized = value.trim().toUpperCase()
                .replace("/", "_")
                .replace("&", "_AND_")
                .replace(" ", "_")
                .replaceAll("_+", "_");

        for (SaleStatus status : values()) {
            if (status.name().equalsIgnoreCase(normalized) || status.name().equalsIgnoreCase(value.trim())) {
                return status;
            }
        }
        if (normalized.contains("NOT_PROVIDED") || normalized.contains("ORDER_ONLY")) {
            return NOT_PROVIDED_OR_ORDER_ONLY_PLACED;
        }
        if (normalized.contains("SATISFIED") || normalized.contains("COMPLET")) {
            return PURCHASE_SATISFIED_AND_ORDER_COMPLETED;
        }
        if (normalized.contains("REPLACE")) {
            return REPLACE_REQUESTED;
        }
        if (normalized.contains("REFUND")) {
            return REFUND_REQUESTED;
        }
        return NOT_PROVIDED_OR_ORDER_ONLY_PLACED;
    }
}
