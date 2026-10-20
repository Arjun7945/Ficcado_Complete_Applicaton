package com.aps.ficcado_crm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;
import java.util.Optional;

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

        Optional<SaleStatus> exact = Arrays.stream(values())
                .filter(status -> status.name().equalsIgnoreCase(normalized) || status.name().equalsIgnoreCase(value.trim()))
                .findFirst();
        if (exact.isPresent()) {
            return exact.get();
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
