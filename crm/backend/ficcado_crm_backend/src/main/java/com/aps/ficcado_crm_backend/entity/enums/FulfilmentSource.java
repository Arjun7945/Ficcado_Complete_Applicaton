package com.aps.ficcado_crm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;
import java.util.Optional;

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

        Optional<FulfilmentSource> exact = Arrays.stream(values())
                .filter(s -> s.name().equalsIgnoreCase(normalized) || s.name().equalsIgnoreCase(value.trim()))
                .findFirst();
        if (exact.isPresent()) {
            return exact.get();
        }
        if (normalized.contains("WAREHOUSE") || normalized.contains("HANDLER")) return WAREHOUSE_HANDLER;
        return TAKE_FROM_INVENTORY;
    }
}
