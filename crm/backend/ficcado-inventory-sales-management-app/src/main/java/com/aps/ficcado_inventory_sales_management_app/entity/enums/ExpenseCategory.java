package com.aps.ficcado_inventory_sales_management_app.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum ExpenseCategory {
    FUEL_EXPENSE,
    PRINTING_EXP,
    TRAVEL_EXP,
    FOOD_EXP,
    TIP_EXP,
    PURCHASE_ON_GOODS_EXP,
    ADVERTISING_EXP,
    VENDOR_SOURCING_TRAVEL,
    PRINTING,
    MARKETING_PROMOTION,
    PACKING,
    OTHER;

    @JsonCreator
    public static ExpenseCategory fromString(String value) {
        if (value == null || value.isBlank()) return OTHER;
        String normalized = value.trim().toUpperCase()
                .replace(" ", "_")
                .replace("/", "_")
                .replaceAll("_+", "_");

        for (ExpenseCategory c : values()) {
            if (c.name().equalsIgnoreCase(normalized) || c.name().equalsIgnoreCase(value.trim())) {
                return c;
            }
        }
        if (normalized.contains("FUEL")) return FUEL_EXPENSE;
        if (normalized.contains("FOOD")) return FOOD_EXP;
        if (normalized.contains("TIP")) return TIP_EXP;
        if (normalized.contains("PURCHASE") || normalized.contains("GOODS")) return PURCHASE_ON_GOODS_EXP;
        if (normalized.contains("ADVERTISING") || normalized.contains("ADVERT")) return ADVERTISING_EXP;
        if (normalized.contains("TRAVEL") || normalized.contains("SOURCING")) return VENDOR_SOURCING_TRAVEL;
        if (normalized.contains("PRINT")) return PRINTING_EXP;
        if (normalized.contains("MARKET") || normalized.contains("PROMO")) return MARKETING_PROMOTION;
        if (normalized.contains("PACK")) return PACKING;
        return OTHER;
    }
}
