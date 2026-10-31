package com.aps.ficcado_payment_gateway_data.service;

import com.aps.ficcado_payment_gateway_data.entity.OutboxEvent;
import com.aps.ficcado_payment_gateway_data.repository.OutboxEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OutboxEventRelayServiceTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private RestTemplate mockRestTemplate;

    private OutboxEventRelayService relayService;

    @BeforeEach
    void setUp() {
        relayService = new OutboxEventRelayService(outboxEventRepository);
        ReflectionTestUtils.setField(relayService, "restTemplate", mockRestTemplate);
        ReflectionTestUtils.setField(relayService, "websiteDataUrl", "http://localhost:8082");
        ReflectionTestUtils.setField(relayService, "internalSecret", "test-secret");
    }

    @Test
    @DisplayName("Should successfully relay pending outbox events and mark as SENT")
    void testRelayPendingEventsSuccess() {
        OutboxEvent event = OutboxEvent.builder()
                .id(1L)
                .aggregateId("TX-12345")
                .eventType("order-status")
                .payload("{\"status\":\"COMPLETED\"}")
                .status("PENDING")
                .createdAt(Instant.now())
                .build();

        when(outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc("PENDING"))
                .thenReturn(List.of(event));

        when(mockRestTemplate.postForEntity(eq("http://localhost:8082/api/internal/notifications/order-status"), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("{\"success\":true}", HttpStatus.OK));

        int dispatched = relayService.relayPendingEventsNow();

        assertEquals(1, dispatched);
        assertEquals("SENT", event.getStatus());
        assertNotNull(event.getProcessedAt());

        verify(outboxEventRepository, times(1)).save(event);
    }

    @Test
    @DisplayName("Should return 0 and skip HTTP call when no pending events exist")
    void testRelayPendingEventsEmpty() {
        when(outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc("PENDING"))
                .thenReturn(Collections.emptyList());

        int dispatched = relayService.relayPendingEventsNow();

        assertEquals(0, dispatched);
        verifyNoInteractions(mockRestTemplate);
        verify(outboxEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should keep event as PENDING if remote call throws an exception")
    void testRelayPendingEventsNetworkFailure() {
        OutboxEvent event = OutboxEvent.builder()
                .id(2L)
                .aggregateId("TX-FAIL")
                .eventType("order-status")
                .payload("{\"status\":\"FAILED\"}")
                .status("PENDING")
                .createdAt(Instant.now())
                .build();

        when(outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc("PENDING"))
                .thenReturn(List.of(event));

        when(mockRestTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new RuntimeException("Connection refused"));

        int dispatched = relayService.relayPendingEventsNow();

        assertEquals(0, dispatched);
        assertEquals("PENDING", event.getStatus());
        assertNull(event.getProcessedAt());
        verify(outboxEventRepository, never()).save(event);
    }
}
