package com.aps.ficcado_crm_backend.session;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;

/**
 * Customer session representation stored in Redis session store.
 * Redis Key: session:cust:{sessionId}
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CustomerSession(
        String sessionId,
        Long customerId,
        Instant createdAt,
        Instant lastActivity,
        Instant pausedUntil
) {
    @JsonIgnore
    public boolean isPaused() {
        return pausedUntil != null && Instant.now().isBefore(pausedUntil);
    }
}
