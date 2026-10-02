package com.aps.ficcado_crm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;
import java.util.Optional;

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

        Optional<DispositionOfItems> exact = Arrays.stream(values())
                .filter(d -> d.name().equalsIgnoreCase(normalized) || d.name().equalsIgnoreCase(value.trim()))
                .findFirst();
        if (exact.isPresent()) {
            return exact.get();
        }
        if (normalized.contains("DAMAG")) return SENT_TO_DAMAGED_PRODUCTS;
        return RETURNED_TO_INVENTORY;
    }
}
