package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.ExpenseDto.ExpenseResponse;
import com.aps.ficcado_crm_backend.entity.Expense;

public final class ExpenseMapper {

    private ExpenseMapper() {}

    public static ExpenseResponse toResponse(Expense e) {
        if (e == null) return null;
        return new ExpenseResponse(
                e.getId(),
                e.getAdmin() != null ? e.getAdmin().getId() : null,
                e.getAdminName(),
                e.getExpenseCategory(),
                e.getCustomCategory(),
                e.getDescription(),
                e.getAmount(),
                e.getDateOfExpense(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}
