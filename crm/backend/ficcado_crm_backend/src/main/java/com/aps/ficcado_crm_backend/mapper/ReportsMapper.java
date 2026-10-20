package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.ReportsDto.ProfitabilityResponse;
import com.aps.ficcado_crm_backend.service.ProfitabilityService.ProfitabilityResult;

public final class ReportsMapper {

    private ReportsMapper() {}

    public static ProfitabilityResponse toResponse(ProfitabilityResult res) {
        if (res == null) return null;
        return ProfitabilityResponse.builder()
                .grossRevenue(res.getGrossRevenue())
                .netRevenue(res.getNetRevenue())
                .cogs(res.getCogs())
                .grossProfit(res.getGrossProfit())
                .operationalExpenses(res.getOperationalExpenses())
                .vendorPayments(res.getVendorPayments())
                .totalExpenses(res.getTotalExpenses())
                .netProfit(res.getNetProfit())
                .discountsProvided(res.getDiscountsProvided())
                .unpaidDues(res.getUnpaidDues())
                .totalRefunded(res.getTotalRefunded())
                .build();
    }
}
