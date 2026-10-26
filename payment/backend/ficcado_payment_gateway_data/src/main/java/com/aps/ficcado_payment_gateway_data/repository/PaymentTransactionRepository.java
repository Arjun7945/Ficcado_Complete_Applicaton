package com.aps.ficcado_payment_gateway_data.repository;

import com.aps.ficcado_payment_gateway_data.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    Optional<PaymentTransaction> findByTransactionId(String transactionId);

    Optional<PaymentTransaction> findByRazorpayOrderId(String razorpayOrderId);

    Optional<PaymentTransaction> findByRazorpayPaymentId(String razorpayPaymentId);

    List<PaymentTransaction> findByCustomerEmailOrderByCreatedAtDesc(String customerEmail);

    List<PaymentTransaction> findBySyncStatus(String syncStatus);

    Optional<PaymentTransaction> findByRefundId(String refundId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM PaymentTransaction p WHERE p.paymentStatus IN :statuses AND p.createdAt <= :olderThan ORDER BY p.createdAt ASC"
    )
    List<PaymentTransaction> findReconciliationCandidates(
            @org.springframework.data.repository.query.Param("statuses") List<String> statuses,
            @org.springframework.data.repository.query.Param("olderThan") java.time.Instant olderThan,
            org.springframework.data.domain.Pageable pageable
    );

    boolean existsByTransactionId(String transactionId);

    boolean existsByRazorpayOrderId(String razorpayOrderId);
}
