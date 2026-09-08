package com.aps.ficcado_inventory_sales_management_app.service;

import com.aps.ficcado_inventory_sales_management_app.entity.SaleLineItem;
import com.aps.ficcado_inventory_sales_management_app.repository.ExpenseRepository;
import com.aps.ficcado_inventory_sales_management_app.repository.ReturnRefundRepository;
import com.aps.ficcado_inventory_sales_management_app.repository.SaleRepository;
import com.aps.ficcado_inventory_sales_management_app.repository.VendorPaymentRepository;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

/**
 * Profitability calculations — migrated from app/api/reports/profitability/.
 * Implements all Part 8 (Section B7) financial formulas:
 *
 *   Gross Revenue    = sum of totalAmount across completed sales
 *   COGS             = sum of (costPrice × quantity) per line item
 *   Gross Profit     = Gross Revenue − COGS
 *   Operational Exp  = sum of Expense.amount in range
 *   Vendor Payments  = sum of VendorPayment.amount in range
 *   Total Expenses   = Operational Expenses + Vendor Payments
 *   Net Profit/Loss  = Gross Profit − Total Expenses
 *   Discounts Given  = sum of sale.discount on completed sales
 *   Unpaid Dues      = sum of totalAmount where paymentStatus = UNPAID
 */
@Service
@RequiredArgsConstructor
public class ProfitabilityService {

    private final SaleRepository saleRepository;
    private final ExpenseRepository expenseRepository;
    private final VendorPaymentRepository vendorPaymentRepository;
    private final ReturnRefundRepository returnRefundRepository;

    @Transactional(readOnly = true)
    public ProfitabilityResult calculate(String period, String month,
                                         LocalDate customFrom, LocalDate customTo) {
        Instant[] range = resolveDateRange(period, month, customFrom, customTo);
        Instant from = range[0];
        Instant to   = range[1];

        // Completed sales in range (with line items fetched)
        var completedSales = saleRepository.findCompletedSalesInRange(from, to);

        BigDecimal grossRevenue = completedSales.stream()
                .map(s -> s.getTotalAmount() != null ? s.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal cogs = completedSales.stream()
                .flatMap(s -> s.getLineItems().stream())
                .map(this::lineItemCogs)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal grossProfit = grossRevenue.subtract(cogs);

        BigDecimal discountsProvided = completedSales.stream()
                .map(s -> s.getDiscount() != null ? s.getDiscount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Expenses and vendor payments in range
        LocalDate fromDate = from.atZone(ZoneId.of("Asia/Kolkata")).toLocalDate();
        LocalDate toDate   = to.atZone(ZoneId.of("Asia/Kolkata")).toLocalDate();

        BigDecimal operationalExpenses = expenseRepository.sumExpensesInRange(fromDate, toDate);
        BigDecimal vendorPayments = vendorPaymentRepository.sumVendorPaymentsInRange(fromDate, toDate);
        BigDecimal totalExpenses = operationalExpenses.add(vendorPayments);

        BigDecimal netProfit = grossProfit.subtract(totalExpenses);

        // Refunds in range (for Payment Transactions view)
        BigDecimal totalRefunded = returnRefundRepository
                .findCompletedRefundsInRange(from, to).stream()
                .map(r -> r.getPriceChargedReturnedItems() != null
                        ? r.getPriceChargedReturnedItems() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netRevenue = grossRevenue.subtract(totalRefunded);

        // Unpaid dues — all time (not date-range scoped, matches existing app behaviour)
        BigDecimal unpaidDues = saleRepository.findByPaymentStatus(
                com.aps.ficcado_inventory_sales_management_app.entity.enums.PaymentStatus.UNPAID)
                .stream()
                .map(s -> s.getTotalAmount() != null ? s.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ProfitabilityResult.builder()
                .grossRevenue(grossRevenue.setScale(2, RoundingMode.HALF_UP))
                .netRevenue(netRevenue.setScale(2, RoundingMode.HALF_UP))
                .cogs(cogs.setScale(2, RoundingMode.HALF_UP))
                .grossProfit(grossProfit.setScale(2, RoundingMode.HALF_UP))
                .operationalExpenses(operationalExpenses.setScale(2, RoundingMode.HALF_UP))
                .vendorPayments(vendorPayments.setScale(2, RoundingMode.HALF_UP))
                .totalExpenses(totalExpenses.setScale(2, RoundingMode.HALF_UP))
                .netProfit(netProfit.setScale(2, RoundingMode.HALF_UP))
                .discountsProvided(discountsProvided.setScale(2, RoundingMode.HALF_UP))
                .unpaidDues(unpaidDues.setScale(2, RoundingMode.HALF_UP))
                .totalRefunded(totalRefunded.setScale(2, RoundingMode.HALF_UP))
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private BigDecimal lineItemCogs(SaleLineItem item) {
        if (item.getItem() == null || item.getItem().getCostPrice() == null) {
            return BigDecimal.ZERO;
        }
        return item.getItem().getCostPrice()
                .multiply(BigDecimal.valueOf(item.getQuantity()));
    }

    private Instant[] resolveDateRange(String period, String month,
                                        LocalDate customFrom, LocalDate customTo) {
        ZoneId zone = ZoneId.of("Asia/Kolkata");
        LocalDate now = LocalDate.now(zone);

        return switch (period.toLowerCase()) {
            case "daily" -> {
                Instant start = now.atStartOfDay(zone).toInstant();
                Instant end   = now.plusDays(1).atStartOfDay(zone).toInstant();
                yield new Instant[]{start, end};
            }
            case "weekly" -> {
                LocalDate weekStart = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                Instant start = weekStart.atStartOfDay(zone).toInstant();
                Instant end   = weekStart.plusWeeks(1).atStartOfDay(zone).toInstant();
                yield new Instant[]{start, end};
            }
            case "monthly" -> {
                // month param: "2026-08"
                LocalDate firstDay = month != null && !month.isBlank()
                        ? YearMonth.parse(month).atDay(1)
                        : now.withDayOfMonth(1);
                LocalDate firstDayNext = firstDay.plusMonths(1);
                yield new Instant[]{
                        firstDay.atStartOfDay(zone).toInstant(),
                        firstDayNext.atStartOfDay(zone).toInstant()
                };
            }
            case "custom" -> {
                Instant start = (customFrom != null ? customFrom : now)
                        .atStartOfDay(zone).toInstant();
                Instant end = (customTo != null ? customTo.plusDays(1) : now.plusDays(1))
                        .atStartOfDay(zone).toInstant();
                yield new Instant[]{start, end};
            }
            default -> throw new IllegalArgumentException("Unknown period: " + period);
        };
    }

    // ── Result DTO (inner class — no need for a separate file) ───────────────

    @Getter
    @Builder
    public static class ProfitabilityResult {
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
