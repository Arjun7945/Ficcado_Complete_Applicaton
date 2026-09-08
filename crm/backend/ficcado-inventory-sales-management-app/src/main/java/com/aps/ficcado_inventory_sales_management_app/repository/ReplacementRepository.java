package com.aps.ficcado_inventory_sales_management_app.repository;

import com.aps.ficcado_inventory_sales_management_app.entity.Replacement;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.ReplacementStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReplacementRepository extends JpaRepository<Replacement, Long> {

    Optional<Replacement> findBySaleId(Long saleId);

    List<Replacement> findByInvoiceStatus(ReplacementStatus status);

    @Query("""
        SELECT r FROM Replacement r
        LEFT JOIN FETCH r.oldItems
        LEFT JOIN FETCH r.newItems
        WHERE r.id = :id
    """)
    Optional<Replacement> findByIdWithItems(@Param("id") Long id);

    @Query("""
        SELECT r FROM Replacement r
        LEFT JOIN FETCH r.oldItems
        LEFT JOIN FETCH r.newItems
        ORDER BY r.createdAt DESC
    """)
    List<Replacement> findAllWithItems();
}
