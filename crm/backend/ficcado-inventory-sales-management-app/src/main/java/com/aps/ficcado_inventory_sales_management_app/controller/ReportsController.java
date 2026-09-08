package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.service.ProfitabilityService;
import com.aps.ficcado_inventory_sales_management_app.service.ProfitabilityService.ProfitabilityResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * Profitability / reports endpoints.
 * Migrated from app/api/reports/profitability/.
 *
 * Query params:
 *   period  — daily | weekly | monthly | custom
 *   month   — "2026-08" (required when period=monthly)
 *   from    — yyyy-MM-dd (required when period=custom)
 *   to      — yyyy-MM-dd (required when period=custom)
 */
@RestController
@RequestMapping("/api/reports")
@Tag(name = "Reports & Profitability")
@RequiredArgsConstructor
public class ReportsController {

    private final ProfitabilityService profitabilityService;

    @PreAuthorize("hasRole('SUPERADMIN')")
    @GetMapping("/profitability")
    @Operation(summary = "Calculate profitability for a given period (daily/weekly/monthly/custom) [SUPERADMIN only]")
    public ResponseEntity<ProfitabilityResult> getProfitability(
            @RequestParam(defaultValue = "monthly")
            @Parameter(description = "daily | weekly | monthly | custom") String period,
            @RequestParam(required = false)
            @Parameter(description = "Month in yyyy-MM format (for period=monthly)") String month,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            @Parameter(description = "Start date (for period=custom)") LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            @Parameter(description = "End date inclusive (for period=custom)") LocalDate to) {

        return ResponseEntity.ok(profitabilityService.calculate(period, month, from, to));
    }
}
