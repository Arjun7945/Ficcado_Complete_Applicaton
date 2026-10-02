package com.aps.ficcado_crm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;
import java.util.Optional;

public enum ReturnReason {
    WRONG_SIZE_FIT,
    DAMAGED_OR_DEFECTIVE_PRODUCT,
    WRONG_PRODUCT_RECEIVED,
    PRODUCT_DOES_NOT_MATCH_DESCRIPTION,
    NOT_SATISFIED_WITH_QUALITY,
    OTHER;

    @JsonCreator
    public static ReturnReason fromString(String value) {
        if (value == null || value.isBlank()) return OTHER;
        String normalized = value.trim().toUpperCase()
                .replace(" ", "_")
                .replace("/", "_")
                .replaceAll("_+", "_");

        Optional<ReturnReason> exact = Arrays.stream(values())
                .filter(r -> r.name().equalsIgnoreCase(normalized) || r.name().equalsIgnoreCase(value.trim()))
                .findFirst();
        if (exact.isPresent()) {
            return exact.get();
        }
        if (normalized.contains("SIZE") || normalized.contains("FIT")) return WRONG_SIZE_FIT;
        if (normalized.contains("DAMAGE") || normalized.contains("DEFECT")) return DAMAGED_OR_DEFECTIVE_PRODUCT;
        if (normalized.contains("WRONG_PRODUCT")) return WRONG_PRODUCT_RECEIVED;
        if (normalized.contains("MATCH") || normalized.contains("PHOTO")) return PRODUCT_DOES_NOT_MATCH_DESCRIPTION;
        if (normalized.contains("QUALITY")) return NOT_SATISFIED_WITH_QUALITY;
        return OTHER;
    }
}
