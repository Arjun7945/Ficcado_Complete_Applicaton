package com.aps.ficcado_inventory_sales_management_app.repository;

import com.aps.ficcado_inventory_sales_management_app.entity.InventoryHistory;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.InventoryTransactionType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryHistoryRepository extends JpaRepository<InventoryHistory, Long> {

    List<InventoryHistory> findByItemIdOrderByLoggedAtDesc(Long itemId);

    List<InventoryHistory> findByTransactionTypeOrderByLoggedAtDesc(InventoryTransactionType transactionType);

    List<InventoryHistory> findByRelatedInvoiceNumberOrderByLoggedAtDesc(String invoiceNumber);

    /** Most recent 200 entries — for dashboard and quick overview. */
    List<InventoryHistory> findTop200ByOrderByLoggedAtDesc();

    /**
     * Keyset/cursor-based pagination for the full inventory history list.
     * Pass the id of the last-seen row as lastSeenId; for the first page use Long.MAX_VALUE.
     */
    @Query("""
        SELECT ih FROM InventoryHistory ih
        WHERE ih.id < :lastSeenId
        ORDER BY ih.id DESC
    """)
    List<InventoryHistory> findPageBeforeId(@Param("lastSeenId") Long lastSeenId, Pageable pageable);
}
