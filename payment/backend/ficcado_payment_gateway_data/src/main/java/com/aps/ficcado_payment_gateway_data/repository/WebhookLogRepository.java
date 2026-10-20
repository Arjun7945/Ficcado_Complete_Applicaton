package com.aps.ficcado_payment_gateway_data.repository;

import com.aps.ficcado_payment_gateway_data.entity.WebhookLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WebhookLogRepository extends JpaRepository<WebhookLog, Long> {

    Optional<WebhookLog> findByEventId(String eventId);

    boolean existsByEventId(String eventId);
}
