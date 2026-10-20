package com.aps.ficcado_crm_backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Data Transfer Objects for the Expense module.
 */
public class ExpenseDto {

    public record ExpenseRequest(
            @NotBlank(message = "Expense category is required") String expenseCategory,
            String customCategory,
            @NotBlank(message = "Expense description is required") String description,
            @NotNull(message = "Amount is required")
            @DecimalMin(value = "0.01", message = "Amount must be greater than 0") BigDecimal amount,
            @NotNull(message = "Date of expense is required") LocalDate dateOfExpense
    ) {}

    public record ExpenseResponse(
            Long id,
            Long adminId,
            String adminName,
            String expenseCategory,
            String customCategory,
            String description,
            BigDecimal amount,
            LocalDate dateOfExpense,
            Instant createdAt,
            Instant updatedAt
    ) {}
}
