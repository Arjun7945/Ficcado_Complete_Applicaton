package com.aps.ficcado_website_data.repository;

import com.aps.ficcado_website_data.entity.OrderNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrderNotificationRepository extends JpaRepository<OrderNotification, Long> {
    Optional<OrderNotification> findByTransactionId(String transactionId);
    boolean existsByTransactionId(String transactionId);
}
