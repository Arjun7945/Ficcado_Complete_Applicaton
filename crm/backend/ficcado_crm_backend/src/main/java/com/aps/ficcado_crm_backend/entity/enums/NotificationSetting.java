package com.aps.ficcado_crm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;
import java.util.Optional;

public enum NotificationSetting {
    ENABLED,
    DISABLED;

    @JsonCreator
    public static NotificationSetting fromString(String value) {
        if (value == null || value.isBlank()) return ENABLED;
        String normalized = value.trim().toUpperCase();
        Optional<NotificationSetting> exact = Arrays.stream(values())
                .filter(n -> n.name().equalsIgnoreCase(normalized))
                .findFirst();
        if (exact.isPresent()) {
            return exact.get();
        }
        if (normalized.startsWith("DIS") || normalized.equals("0") || normalized.equals("FALSE")) {
            return DISABLED;
        }
        return ENABLED;
    }
}

