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

    boolean existsByTransactionId(String transactionId);

    boolean existsByRazorpayOrderId(String razorpayOrderId);
}
