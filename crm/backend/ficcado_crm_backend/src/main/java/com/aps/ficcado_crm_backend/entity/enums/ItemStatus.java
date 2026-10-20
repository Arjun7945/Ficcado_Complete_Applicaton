package com.aps.ficcado_crm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;
import java.util.Optional;

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

        if (normalized.equals("IN_STOCK") || normalized.equals("ACTIVE") || normalized.equals("INSTOCK") || normalized.equals("IN_STOCKS")) {
            return ACTIVE;
        }
        if (normalized.contains("OUT_OF_STOCK") || normalized.equals("OUT_STOCK") || normalized.equals("OUTOFSTOCK") || normalized.equals("OUT")) {
            return OUT_OF_STOCK;
        }
        if (normalized.contains("INACTIVE")) {
            return INACTIVE;
        }
        if (normalized.contains("DISCONTINU")) {
            return DISCONTINUED;
        }

        Optional<ItemStatus> exact = Arrays.stream(values())
                .filter(status -> status.name().equalsIgnoreCase(normalized) || status.name().equalsIgnoreCase(value.trim()))
                .findFirst();
        return exact.orElse(ACTIVE);
    }
}
