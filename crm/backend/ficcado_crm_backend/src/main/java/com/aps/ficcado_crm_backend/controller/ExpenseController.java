package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.ExpenseDto.ExpenseRequest;
import com.aps.ficcado_crm_backend.dto.ExpenseDto.ExpenseResponse;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Expense;
import com.aps.ficcado_crm_backend.mapper.ExpenseMapper;
import com.aps.ficcado_crm_backend.service.ExpenseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
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
        return expenseService.getAll().stream()
                .map(ExpenseMapper::toResponse)
                .toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get expense by ID")
    public ResponseEntity<ExpenseResponse> getById(@PathVariable Long id) {
        return expenseService.getById(id)
                .map(ExpenseMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create expense")
    public ResponseEntity<ExpenseResponse> create(@Valid @RequestBody ExpenseRequest request,
                                                   @AuthenticationPrincipal Admin admin) {
        log.info("Creating expense: category={}, amount={}, date={}",
                request.expenseCategory(), request.amount(), request.dateOfExpense());
        Expense saved = expenseService.createExpense(
                request.expenseCategory(),
                request.customCategory(),
                request.description(),
                request.amount(),
                request.dateOfExpense(),
                admin
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ExpenseMapper.toResponse(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update expense")
    public ResponseEntity<ExpenseResponse> update(@PathVariable Long id,
                                                   @Valid @RequestBody ExpenseRequest request,
                                                   @AuthenticationPrincipal Admin admin) {
        log.info("Updating expense [id={}]", id);
        return expenseService.updateExpense(
                id,
                request.expenseCategory(),
                request.customCategory(),
                request.description(),
                request.amount(),
                request.dateOfExpense(),
                admin
        ).map(ExpenseMapper::toResponse)
         .map(ResponseEntity::ok)
         .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete expense")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                        @AuthenticationPrincipal Admin admin) {
        log.info("Deleting expense [id={}]", id);
        boolean deleted = expenseService.deleteExpense(id, admin);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
