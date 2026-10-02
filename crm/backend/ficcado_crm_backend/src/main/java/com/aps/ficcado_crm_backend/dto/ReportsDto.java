package com.aps.ficcado_crm_backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * Data Transfer Objects for the Reports module.
 */
public class ReportsDto {

    @Getter
    @Builder
    public static class ProfitabilityResponse {
        private final BigDecimal grossRevenue;
        private final BigDecimal netRevenue;
        private final BigDecimal cogs;
        private final BigDecimal grossProfit;
        private final BigDecimal operationalExpenses;
        private final BigDecimal vendorPayments;
        private final BigDecimal totalExpenses;
        private final BigDecimal netProfit;
        private final BigDecimal discountsProvided;
        private final BigDecimal unpaidDues;
        private final BigDecimal totalRefunded;
    }
}
