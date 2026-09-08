package com.aps.ficcado_inventory_sales_management_app.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum AdminRole {
    SUPERADMIN,
    ADMIN;

    @JsonCreator
    public static AdminRole fromString(String value) {
        if (value == null || value.isBlank()) return ADMIN;
        String normalized = value.trim().toUpperCase();
        for (AdminRole role : values()) {
            if (role.name().equalsIgnoreCase(normalized)) {
                return role;
            }
        }
        if (normalized.contains("SUPER")) return SUPERADMIN;
        return ADMIN;
    }
}
