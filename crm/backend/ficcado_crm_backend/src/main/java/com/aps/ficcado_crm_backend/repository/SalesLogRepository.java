package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.SalesLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface SalesLogRepository extends JpaRepository<SalesLog, Long> {

    List<SalesLog> findByRelatedInvoiceNumberOrderByCreatedAtDesc(String invoiceNumber);

    /** Most recent 100 logs — used for the dashboard Sales Log preview widget. */
    List<SalesLog> findTop100ByOrderByCreatedAtDesc();

    /**
     * Keyset/cursor-based pagination for the full sales log list.
     * Pass the id of the last-seen row as lastSeenId; for the first page use Long.MAX_VALUE.
     * Stays O(log n) regardless of page depth — no OFFSET scan.
     */
    @Query("""
        SELECT sl FROM SalesLog sl
        WHERE sl.id < :lastSeenId
        ORDER BY sl.id DESC
    """)
    List<SalesLog> findPageBeforeId(@Param("lastSeenId") Long lastSeenId, Pageable pageable);

    int deleteByCreatedAtBefore(Instant cutoff);
}
