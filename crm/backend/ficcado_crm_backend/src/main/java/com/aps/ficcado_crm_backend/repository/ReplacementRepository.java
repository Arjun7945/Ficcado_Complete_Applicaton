package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.Replacement;
import com.aps.ficcado_crm_backend.entity.enums.ReplacementStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReplacementRepository extends JpaRepository<Replacement, Long> {

    Optional<Replacement> findBySaleId(Long saleId);

    Optional<Replacement> findByInvoiceNumber(String invoiceNumber);

    List<Replacement> findByInvoiceStatus(ReplacementStatus status);

    @Query("""
        SELECT r FROM Replacement r
        LEFT JOIN FETCH r.sale
        LEFT JOIN FETCH r.oldItems
        LEFT JOIN FETCH r.newItems
        WHERE r.invoiceNumber = :invoiceNumber
    """)
    Optional<Replacement> findByInvoiceNumberWithItems(@Param("invoiceNumber") String invoiceNumber);

    @Query("""
        SELECT r FROM Replacement r
        LEFT JOIN FETCH r.sale
        LEFT JOIN FETCH r.oldItems
        LEFT JOIN FETCH r.newItems
        WHERE r.id = :id
    """)
    Optional<Replacement> findByIdWithItems(@Param("id") Long id);

    @Query("""
        SELECT r FROM Replacement r
        LEFT JOIN FETCH r.sale
        LEFT JOIN FETCH r.oldItems
        LEFT JOIN FETCH r.newItems
        ORDER BY r.createdAt DESC
    """)
    List<Replacement> findAllWithItems();
}
