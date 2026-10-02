package com.aps.ficcado_crm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;

public enum AdminRole {
    SUPERADMIN,
    ADMIN;

    @JsonCreator
    public static AdminRole fromString(String value) {
        if (value == null || value.isBlank()) return ADMIN;
        String normalized = value.trim().toUpperCase();
        return Arrays.stream(values())
                .filter(role -> role.name().equalsIgnoreCase(normalized))
                .findFirst()
                .orElseGet(() -> normalized.contains("SUPER") ? SUPERADMIN : ADMIN);
    }
}
