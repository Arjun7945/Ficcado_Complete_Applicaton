package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.entity.enums.PaymentStatus;
import com.aps.ficcado_crm_backend.entity.enums.SaleStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {

    Optional<Sale> findByInvoiceNumber(String invoiceNumber);

    boolean existsByInvoiceNumber(String invoiceNumber);

    List<Sale> findByCustomerId(Long customerId);

    List<Sale> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Sale> findBySaleStatus(SaleStatus status);

    List<Sale> findByPaymentStatus(PaymentStatus status);

    List<Sale> findByCreatedAtBetween(Instant from, Instant to);

    List<Sale> findBySaleStatusAndCreatedAtBetween(SaleStatus status, Instant from, Instant to);

    /**
     * Full-text search across invoice number, customer name, and customer phone number.
     */
    @Query("""
        SELECT DISTINCT s FROM Sale s
        LEFT JOIN FETCH s.lineItems
        LEFT JOIN FETCH s.saleClosedByAdmin
        LEFT JOIN FETCH s.createdByAdmin
        WHERE LOWER(s.invoiceNumber) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(s.customerName) LIKE LOWER(CONCAT('%', :query, '%'))
           OR s.customerPhoneNumber LIKE CONCAT('%', :query, '%')
        ORDER BY s.createdAt DESC
    """)
    List<Sale> searchSales(@Param("query") String query);

    @Query("""
        SELECT s FROM Sale s
        LEFT JOIN FETCH s.lineItems
        LEFT JOIN FETCH s.saleClosedByAdmin
        LEFT JOIN FETCH s.createdByAdmin
        WHERE s.id = :id
    """)
    Optional<Sale> findByIdWithLineItems(@Param("id") Long id);

    @Query("""
        SELECT s FROM Sale s
        LEFT JOIN FETCH s.lineItems
        LEFT JOIN FETCH s.saleClosedByAdmin
        LEFT JOIN FETCH s.createdByAdmin
        WHERE s.invoiceNumber = :invoiceNumber
    """)
    Optional<Sale> findByInvoiceNumberWithLineItems(@Param("invoiceNumber") String invoiceNumber);

    /**
     * List all sales with their line items in a single JOIN FETCH — prevents N+1.
     * Without JOIN FETCH, accessing lineItems for each sale in a list fires
     * one extra query per sale row (classic N+1 pattern).
     */
    @Query("""
        SELECT DISTINCT s FROM Sale s
        LEFT JOIN FETCH s.lineItems
        LEFT JOIN FETCH s.saleClosedByAdmin
        LEFT JOIN FETCH s.createdByAdmin
        ORDER BY s.createdAt DESC
    """)
    List<Sale> findAllWithLineItems();

    /**
     * Keyset/cursor-based pagination for the Sales list.
     * Stays O(log n) regardless of page depth, unlike OFFSET which degrades
     * as the database must scan past all skipped rows.
     *
     * Usage: pass the id of the last-seen row; use Long.MAX_VALUE for the first page.
     */
    @Query("""
        SELECT DISTINCT s FROM Sale s
        LEFT JOIN FETCH s.lineItems
        LEFT JOIN FETCH s.saleClosedByAdmin
        LEFT JOIN FETCH s.createdByAdmin
        WHERE s.id < :lastSeenId
        ORDER BY s.id DESC
    """)
    List<Sale> findPageBeforeId(@Param("lastSeenId") Long lastSeenId, Pageable pageable);

    /**
     * Profitability queries — fetch completed sales for a date range with line items.
     */
    @Query("""
        SELECT s FROM Sale s
        LEFT JOIN FETCH s.lineItems
        WHERE s.saleStatus = 'PURCHASE_SATISFIED_AND_ORDER_COMPLETED'
          AND s.createdAt >= :from AND s.createdAt < :to
    """)
    List<Sale> findCompletedSalesInRange(@Param("from") Instant from, @Param("to") Instant to);
}
