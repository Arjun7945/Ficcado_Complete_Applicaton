package com.aps.ficcado_crm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;
import java.util.Optional;

public enum DeliveryStatus {
    PACKED_AND_READY_FOR_SHIPMENT,
    IN_TRANSIT,
    ORDER_DELIVERED_SUCCESSFULLY,
    ORDER_MISSING,
    ORDER_FAILED_TO_DELIVER_AND_RETURNING_BACK,
    SPECIFIC_ITEMS_RETURNING,
    ALL_ITEMS_RETURNING_BACK,
    DELIVERED,
    PENDING,
    FAILED,
    RETURNED;

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static DeliveryStatus fromString(String value) {
        if (value == null || value.isBlank()) return PENDING;
        String normalized = value.trim().toUpperCase()
                .replace(" ", "_")
                .replace("/", "_")
                .replace("-", "_")
                .replaceAll("_+", "_");

        Optional<DeliveryStatus> exact = Arrays.stream(values())
                .filter(status -> status.name().equalsIgnoreCase(normalized) || status.name().equalsIgnoreCase(value.trim()))
                .findFirst();
        if (exact.isPresent()) {
            return exact.get();
        }
        if (normalized.contains("PACKED") || normalized.contains("READY")) return PACKED_AND_READY_FOR_SHIPMENT;
        if (normalized.contains("DELIVERED_SUCCESSFULLY") || normalized.contains("SUCCESSFULLY")) return ORDER_DELIVERED_SUCCESSFULLY;
        if (normalized.contains("DELIVER")) return DELIVERED;
        if (normalized.contains("TRANSIT")) return IN_TRANSIT;
        if (normalized.contains("MISSING")) return ORDER_MISSING;
        if (normalized.contains("FAILED_TO_DELIVER") || normalized.contains("RETURNING_BACK")) return ORDER_FAILED_TO_DELIVER_AND_RETURNING_BACK;
        if (normalized.contains("SPECIFIC")) return SPECIFIC_ITEMS_RETURNING;
        if (normalized.contains("ALL_ITEMS")) return ALL_ITEMS_RETURNING_BACK;
        if (normalized.contains("FAIL")) return FAILED;
        if (normalized.contains("RETURN")) return RETURNED;
        return PENDING;
    }
}
