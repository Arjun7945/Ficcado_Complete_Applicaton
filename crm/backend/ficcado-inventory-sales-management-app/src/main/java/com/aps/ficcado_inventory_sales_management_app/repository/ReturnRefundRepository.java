package com.aps.ficcado_inventory_sales_management_app.repository;

import com.aps.ficcado_inventory_sales_management_app.entity.ReturnRefund;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnRefundRepository extends JpaRepository<ReturnRefund, Long> {

    Optional<ReturnRefund> findBySaleId(Long saleId);

    List<ReturnRefund> findByRefundStatus(RefundStatus status);

    List<ReturnRefund> findByRefundCompletedDateTimeBetween(Instant from, Instant to);

    @Query("""
        SELECT rr FROM ReturnRefund rr
        LEFT JOIN FETCH rr.returnedItems
        WHERE rr.id = :id
    """)
    Optional<ReturnRefund> findByIdWithItems(@Param("id") Long id);

    @Query("""
        SELECT rr FROM ReturnRefund rr
        LEFT JOIN FETCH rr.returnedItems
        ORDER BY rr.createdAt DESC
    """)
    List<ReturnRefund> findAllWithItems();

    /**
     * For Payment Transactions ledger — completed refunds with their transaction IDs.
     */
    @Query("""
        SELECT rr FROM ReturnRefund rr
        LEFT JOIN FETCH rr.returnedItems
        WHERE rr.refundStatus = 'COMPLETED'
          AND rr.refundCompletedDateTime >= :from
          AND rr.refundCompletedDateTime < :to
        ORDER BY rr.refundCompletedDateTime DESC
    """)
    List<ReturnRefund> findCompletedRefundsInRange(@Param("from") Instant from, @Param("to") Instant to);
}
