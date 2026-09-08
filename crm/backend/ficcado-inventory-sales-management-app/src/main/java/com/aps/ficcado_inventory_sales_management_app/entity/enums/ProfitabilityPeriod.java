package com.aps.ficcado_inventory_sales_management_app.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum ProfitabilityPeriod {
    TODAY,
    LAST_7_DAYS,
    THIS_MONTH,
    CUSTOM,
    DAILY,
    WEEKLY,
    MONTHLY;

    @JsonCreator
    public static ProfitabilityPeriod fromString(String value) {
        if (value == null || value.isBlank()) return THIS_MONTH;
        String normalized = value.trim().toUpperCase()
                .replace(" ", "_")
                .replace("-", "_")
                .replaceAll("_+", "_");

        for (ProfitabilityPeriod p : values()) {
            if (p.name().equalsIgnoreCase(normalized) || p.name().equalsIgnoreCase(value.trim())) {
                return p;
            }
        }
        if (normalized.contains("TODAY")) return TODAY;
        if (normalized.contains("7_DAYS") || normalized.contains("7DAYS")) return LAST_7_DAYS;
        if (normalized.contains("MONTH")) return THIS_MONTH;
        if (normalized.contains("CUSTOM")) return CUSTOM;
        if (normalized.contains("DAY") || normalized.contains("DAILY")) return DAILY;
        if (normalized.contains("WEEK")) return WEEKLY;
        return THIS_MONTH;
    }
}
