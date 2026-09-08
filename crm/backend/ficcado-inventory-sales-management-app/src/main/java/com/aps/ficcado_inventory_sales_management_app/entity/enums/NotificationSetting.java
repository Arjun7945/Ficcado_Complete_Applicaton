package com.aps.ficcado_inventory_sales_management_app.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum NotificationSetting {
    ENABLED,
    DISABLED;

    @JsonCreator
    public static NotificationSetting fromString(String value) {
        if (value == null || value.isBlank()) return ENABLED;
        String normalized = value.trim().toUpperCase();
        for (NotificationSetting n : values()) {
            if (n.name().equalsIgnoreCase(normalized)) {
                return n;
            }
        }
        if (normalized.startsWith("DIS") || normalized.equals("0") || normalized.equals("FALSE")) {
            return DISABLED;
        }
        return ENABLED;
    }
}

