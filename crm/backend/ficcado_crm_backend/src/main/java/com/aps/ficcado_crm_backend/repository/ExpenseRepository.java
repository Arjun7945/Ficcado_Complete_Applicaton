package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByExpenseCategory(String category);

    List<Expense> findByDateOfExpenseBetween(LocalDate from, LocalDate to);

    List<Expense> findByAdminId(Long adminId);

    List<Expense> findByDescriptionContainingIgnoreCaseOrAdminNameContainingIgnoreCase(
            String description, String adminName);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.dateOfExpense >= :from AND e.dateOfExpense < :to")
    BigDecimal sumExpensesInRange(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
