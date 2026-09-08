package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.Expense;
import com.aps.ficcado_inventory_sales_management_app.repository.ExpenseRepository;
import com.aps.ficcado_inventory_sales_management_app.service.ActivityLogService;
import com.aps.ficcado_inventory_sales_management_app.service.ExpenseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@Tag(name = "Expenses")
@PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping
    @Operation(summary = "List all expenses")
    public List<ExpenseResponse> getAll() {
        return expenseService.getAll().stream().map(ExpenseResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get expense by ID")
    public ResponseEntity<ExpenseResponse> getById(@PathVariable Long id) {
        return expenseService.getById(id)
                .map(ExpenseResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create expense")
    public ResponseEntity<ExpenseResponse> create(@RequestBody ExpenseRequest request,
                                                  @AuthenticationPrincipal Admin admin) {
        Expense saved = expenseService.createExpense(
                request.expenseCategory(),
                request.customCategory(),
                request.description(),
                request.amount(),
                request.dateOfExpense(),
                admin
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ExpenseResponse.from(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update expense")
    public ResponseEntity<ExpenseResponse> update(@PathVariable Long id,
                                                  @RequestBody ExpenseRequest request,
                                                  @AuthenticationPrincipal Admin admin) {
        return expenseService.updateExpense(
                id,
                request.expenseCategory(),
                request.customCategory(),
                request.description(),
                request.amount(),
                request.dateOfExpense(),
                admin
        ).map(ExpenseResponse::from)
         .map(ResponseEntity::ok)
         .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete expense")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal Admin admin) {
        boolean deleted = expenseService.deleteExpense(id, admin);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    record ExpenseRequest(String expenseCategory, String customCategory,
                          String description, BigDecimal amount, LocalDate dateOfExpense) {}

    record ExpenseResponse(Long id, Long adminId, String adminName,
                           String expenseCategory, String customCategory,
                           String description, BigDecimal amount,
                           LocalDate dateOfExpense, Instant createdAt, Instant updatedAt) {
        static ExpenseResponse from(Expense e) {
            return new ExpenseResponse(
                    e.getId(),
                    e.getAdmin() != null ? e.getAdmin().getId() : null,
                    e.getAdminName(), e.getExpenseCategory(), e.getCustomCategory(),
                    e.getDescription(), e.getAmount(), e.getDateOfExpense(),
                    e.getCreatedAt(), e.getUpdatedAt());
        }
    }
}
