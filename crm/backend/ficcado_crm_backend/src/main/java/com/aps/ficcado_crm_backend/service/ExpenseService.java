package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Expense;
import com.aps.ficcado_crm_backend.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final ActivityLogService activityLogService;

    @Transactional(readOnly = true)
    public List<Expense> getAll() {
        return expenseRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Expense> getById(Long id) {
        return expenseRepository.findById(id);
    }

    @Transactional
    public Expense createExpense(String category, String customCategory, String description,
                                 BigDecimal amount, LocalDate dateOfExpense, Admin admin) {
        String resolvedAdminName = (admin != null && admin.getAdminName() != null && !admin.getAdminName().isBlank())
                ? admin.getAdminName() : "Admin";
        String resolvedCategory = (category != null && !category.isBlank()) ? category.trim() : "OTHER";

        Expense expense = Expense.builder()
                .admin(admin)
                .adminName(resolvedAdminName)
                .expenseCategory(resolvedCategory)
                .customCategory(customCategory)
                .description(description)
                .amount(amount != null ? amount : BigDecimal.ZERO)
                .dateOfExpense(dateOfExpense != null ? dateOfExpense : LocalDate.now())
                .createdByAdmin(admin)
                .updatedByAdmin(admin)
                .build();

        Expense saved = expenseRepository.save(expense);
        activityLogService.log(admin, "CREATE", "EXPENSES", "expenses",
                saved.getId().toString(),
                "Expense created: " + category + " ₹" + amount);
        log.info("Expense created [id={}, category={}, amount={}]", saved.getId(), category, amount);
        return saved;
    }

    @Transactional
    public Optional<Expense> updateExpense(Long id, String category, String customCategory,
                                          String description, BigDecimal amount,
                                          LocalDate dateOfExpense, Admin admin) {
        return expenseRepository.findById(id).map(expense -> {
            expense.setExpenseCategory(category);
            expense.setCustomCategory(customCategory);
            expense.setDescription(description);
            expense.setAmount(amount != null ? amount : BigDecimal.ZERO);
            expense.setDateOfExpense(dateOfExpense);
            expense.setUpdatedByAdmin(admin);
            Expense saved = expenseRepository.save(expense);
            activityLogService.log(admin, "UPDATE", "EXPENSES", "expenses",
                    id.toString(), "Expense updated");
            log.info("Expense updated [id={}]", id);
            return saved;
        });
    }

    @Transactional
    public boolean deleteExpense(Long id, Admin admin) {
        return expenseRepository.findById(id).map(e -> {
            activityLogService.log(admin, "DELETE", "EXPENSES", "expenses",
                    id.toString(), "Expense deleted");
            expenseRepository.deleteById(id);
            return true;
        }).orElse(false);
    }
}
