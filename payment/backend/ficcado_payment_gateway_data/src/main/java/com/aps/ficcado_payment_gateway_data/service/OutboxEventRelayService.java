package com.aps.ficcado_payment_gateway_data.service;

import com.aps.ficcado_payment_gateway_data.entity.OutboxEvent;
import com.aps.ficcado_payment_gateway_data.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.List;

/**
 * Background relay service for outbox events (Part 2 Phase P2-7 & P2-8).
 * Scans for PENDING outbox events and pushes them to Ficcado-Website-Data
 * for idempotent email and notification processing. Guarded by ShedLock.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.outbox.relay-enabled", havingValue = "true", matchIfMissing = true)
public class OutboxEventRelayService {

    private final OutboxEventRepository outboxEventRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.website-data.url:http://localhost:8082}")
    private String websiteDataUrl;

    @Value("${app.website-data.internal-secret:ficcado-internal-service-secret-key-change-in-prod}")
    private String internalSecret;

    @Scheduled(fixedDelayString = "${app.outbox.relay-fixed-delay-ms:5000}")
    @SchedulerLock(name = "outboxRelayLock", lockAtLeastFor = "PT2S", lockAtMostFor = "PT4S")
    public void scheduleRelayPendingEvents() {
        relayPendingEventsNow();
    }

    /**
     * Relays all currently pending outbox events up to batch size 50.
     * Can be invoked directly in integration tests or by the scheduler.
     *
     * @return number of successfully relayed events
     */
    public int relayPendingEventsNow() {
        List<OutboxEvent> pendingEvents = outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc("PENDING");
        if (pendingEvents.isEmpty()) {
            return 0;
        }

        log.debug("Found {} pending outbox event(s) to relay", pendingEvents.size());
        int dispatched = 0;

        for (OutboxEvent event : pendingEvents) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("X-Internal-Secret", internalSecret);

                HttpEntity<String> entity = new HttpEntity<>(event.getPayload(), headers);
                String targetUrl = websiteDataUrl + "/api/internal/notifications/order-status";

                ResponseEntity<String> response = restTemplate.postForEntity(targetUrl, entity, String.class);
                if (response.getStatusCode().is2xxSuccessful()) {
                    event.setStatus("SENT");
                    event.setProcessedAt(Instant.now());
                    outboxEventRepository.save(event);
                    dispatched++;
                    log.info("Relayed outbox event [id={}, aggregateId={}, eventType={}] to website-data",
                            event.getId(), event.getAggregateId(), event.getEventType());
                } else {
                    log.warn("Website-data returned non-2xx status {} for outbox event id={}",
                            response.getStatusCode(), event.getId());
                }
            } catch (Exception ex) {
                log.error("Failed to relay outbox event id={} [aggregateId={}]: {}",
                        event.getId(), event.getAggregateId(), ex.getMessage());
            }
        }

        return dispatched;
    }
}
