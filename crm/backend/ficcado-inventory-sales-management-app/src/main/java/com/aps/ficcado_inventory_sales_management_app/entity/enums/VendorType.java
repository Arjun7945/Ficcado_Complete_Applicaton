package com.aps.ficcado_inventory_sales_management_app.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum VendorType {
    COURIER_PARTNER,
    DESIGNER_TEAM,
    PRINTING_PARTNER,
    MARKETING_PARTNERS,
    PACKING_TEAM,
    STOCK_MANAGEMENT_TEAM,
    TRANSPORTATION_TEAM,
    HANDLER_TEAM,
    DESIGNER,
    PRINTING,
    MARKETING,
    OTHER;

    @JsonCreator
    public static VendorType fromString(String value) {
        if (value == null || value.isBlank()) return OTHER;
        String normalized = value.trim().toUpperCase()
                .replace(" ", "_")
                .replace("/", "_")
                .replaceAll("_+", "_");

        for (VendorType v : values()) {
            if (v.name().equalsIgnoreCase(normalized) || v.name().equalsIgnoreCase(value.trim())) {
                return v;
            }
        }
        if (normalized.contains("COURIER")) return COURIER_PARTNER;
        if (normalized.contains("DESIGN")) return DESIGNER_TEAM;
        if (normalized.contains("PRINT")) return PRINTING_PARTNER;
        if (normalized.contains("MARKET")) return MARKETING_PARTNERS;
        if (normalized.contains("PACK")) return PACKING_TEAM;
        if (normalized.contains("STOCK")) return STOCK_MANAGEMENT_TEAM;
        if (normalized.contains("TRANSPORT")) return TRANSPORTATION_TEAM;
        if (normalized.contains("HANDLER")) return HANDLER_TEAM;
        return OTHER;
    }
}
