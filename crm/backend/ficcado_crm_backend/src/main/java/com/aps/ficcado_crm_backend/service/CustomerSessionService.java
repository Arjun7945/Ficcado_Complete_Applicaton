package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.exception.SessionServiceUnavailableException;
import com.aps.ficcado_crm_backend.session.CustomerSession;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Server-side Customer Session Management Service backed by dedicated Redis (Port 6380, noeviction).
 *
 * Enforces:
 * - 256-bit SecureRandom session IDs (64 hex characters).
 * - Sliding 600-second (10-minute) idle timeout refreshed atomically on user-initiated requests.
 * - Background requests (X-Ficcado-Background: 1) do NOT refresh sliding timeout.
 * - Paused sessions during checkout/payment (up to 15 minutes) count as active.
 * - Fails closed with SessionServiceUnavailableException (HTTP 503) if Redis is down.
 * - Single-session revocation on logout and multi-session revocation on password change.
 */
@Slf4j
@Service
public class CustomerSessionService {

    public static final String SESSION_KEY_PREFIX = "session:cust:";
    public static final String CUSTOMER_SESSIONS_PREFIX = "cust:sessions:";

    private final RedisTemplate<String, String> sessionRedisTemplate;
    private final ObjectMapper objectMapper;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.session.idle-timeout-seconds:600}")
    private long idleTimeoutSeconds;

    public CustomerSessionService(
            @Qualifier("sessionRedisTemplate") RedisTemplate<String, String> sessionRedisTemplate,
            ObjectMapper objectMapper) {
        this.sessionRedisTemplate = sessionRedisTemplate;
        this.objectMapper = objectMapper;
    }

    public void setIdleTimeoutSeconds(long idleTimeoutSeconds) {
        this.idleTimeoutSeconds = idleTimeoutSeconds;
    }

    public long getIdleTimeoutSeconds() {
        return this.idleTimeoutSeconds;
    }

    /**
     * Creates a new 256-bit SecureRandom customer session in Redis.
     */
    public CustomerSession createSession(Long customerId) {
        if (customerId == null) {
            throw new IllegalArgumentException("Customer ID cannot be null");
        }

        byte[] randomBytes = new byte[32]; // 256 bits
        secureRandom.nextBytes(randomBytes);
        String sessionId = HexFormat.of().formatHex(randomBytes);

        Instant now = Instant.now();
        CustomerSession session = new CustomerSession(sessionId, customerId, now, now, null);

        try {
            String json = objectMapper.writeValueAsString(session);
            String sessionKey = SESSION_KEY_PREFIX + sessionId;
            String userSetKey = CUSTOMER_SESSIONS_PREFIX + customerId;

            sessionRedisTemplate.opsForValue().set(sessionKey, json, Duration.ofSeconds(idleTimeoutSeconds));
            sessionRedisTemplate.opsForSet().add(userSetKey, sessionId);

            log.info("Created customer session [customerId={}, sessionId={}]", customerId, sessionId);
            return session;
        } catch (Exception e) {
            log.error("Failed to create customer session in Redis [customerId={}]: {}", customerId, e.getMessage());
            throw new SessionServiceUnavailableException("Session service temporarily unavailable", e);
        }
    }

    /**
     * Validates a session by sessionId.
     * If isUserInitiated is true and session is not currently paused, refreshes the sliding idle timeout to 600s.
     * If request is background (isUserInitiated = false), validates without refreshing TTL.
     */
    public Optional<CustomerSession> validateSession(String sessionId, boolean isUserInitiated) {
        if (sessionId == null || sessionId.isBlank()) {
            return Optional.empty();
        }

        String sessionKey = SESSION_KEY_PREFIX + sessionId;
        try {
            String json = sessionRedisTemplate.opsForValue().get(sessionKey);
            if (json == null || json.isBlank()) {
                return Optional.empty();
            }

            CustomerSession session = objectMapper.readValue(json, CustomerSession.class);

            if (session.isPaused()) {
                // Session is paused for payment — counts as active
                return Optional.of(session);
            }

            if (isUserInitiated) {
                // Refresh sliding idle timeout atomically
                Instant now = Instant.now();
                CustomerSession updated = new CustomerSession(
                        session.sessionId(),
                        session.customerId(),
                        session.createdAt(),
                        now,
                        null
                );
                String updatedJson = objectMapper.writeValueAsString(updated);
                sessionRedisTemplate.opsForValue().set(sessionKey, updatedJson, Duration.ofSeconds(idleTimeoutSeconds));
                return Optional.of(updated);
            }

            return Optional.of(session);
        } catch (Exception e) {
            log.error("Error validating session in Redis [sessionId={}]: {}", sessionId, e.getMessage());
            throw new SessionServiceUnavailableException("Session service temporarily unavailable", e);
        }
    }

    /**
     * Read-only lookup of session without refreshing activity or expiration.
     */
    public Optional<CustomerSession> getSession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return Optional.empty();
        }

        String sessionKey = SESSION_KEY_PREFIX + sessionId;
        try {
            String json = sessionRedisTemplate.opsForValue().get(sessionKey);
            if (json == null || json.isBlank()) {
                return Optional.empty();
            }
            CustomerSession session = objectMapper.readValue(json, CustomerSession.class);
            return Optional.of(session);
        } catch (Exception e) {
            log.error("Error reading session from Redis: {}", e.getMessage());
            throw new SessionServiceUnavailableException("Session service temporarily unavailable", e);
        }
    }

    /**
     * Returns remaining TTL in seconds for the session without extending it.
     */
    public long getRemainingSeconds(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return 0;
        }

        String sessionKey = SESSION_KEY_PREFIX + sessionId;
        try {
            Long ttl = sessionRedisTemplate.getExpire(sessionKey, TimeUnit.SECONDS);
            return (ttl != null && ttl > 0) ? ttl : 0;
        } catch (Exception e) {
            log.error("Error getting session TTL from Redis: {}", e.getMessage());
            throw new SessionServiceUnavailableException("Session service temporarily unavailable", e);
        }
    }

    /**
     * Touch keep-alive endpoint: refreshes sliding idle timeout to 600s.
     */
    public Optional<CustomerSession> touchSession(String sessionId) {
        return validateSession(sessionId, true);
    }

    /**
     * Pauses session for up to 15 minutes (for payment flows).
     */
    public Optional<CustomerSession> pauseSession(String sessionId, int minutes) {
        int clampedMinutes = Math.min(Math.max(minutes, 1), 15);
        if (sessionId == null || sessionId.isBlank()) {
            return Optional.empty();
        }

        String sessionKey = SESSION_KEY_PREFIX + sessionId;
        try {
            String json = sessionRedisTemplate.opsForValue().get(sessionKey);
            if (json == null || json.isBlank()) {
                return Optional.empty();
            }

            CustomerSession existing = objectMapper.readValue(json, CustomerSession.class);
            Instant pausedUntil = Instant.now().plus(Duration.ofMinutes(clampedMinutes));
            CustomerSession paused = new CustomerSession(
                    existing.sessionId(),
                    existing.customerId(),
                    existing.createdAt(),
                    Instant.now(),
                    pausedUntil
            );

            long pauseSeconds = clampedMinutes * 60L + 60L; // buffer
            long ttlSeconds = Math.max(idleTimeoutSeconds, pauseSeconds);
            String updatedJson = objectMapper.writeValueAsString(paused);
            sessionRedisTemplate.opsForValue().set(sessionKey, updatedJson, Duration.ofSeconds(ttlSeconds));

            log.info("Paused customer session [sessionId={}, customerId={}, minutes={}]",
                    sessionId, existing.customerId(), clampedMinutes);
            return Optional.of(paused);
        } catch (Exception e) {
            log.error("Error pausing session in Redis: {}", e.getMessage());
            throw new SessionServiceUnavailableException("Session service temporarily unavailable", e);
        }
    }

    /**
     * Deletes single session from Redis (on logout).
     */
    public void deleteSession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) return;

        String sessionKey = SESSION_KEY_PREFIX + sessionId;
        try {
            String json = sessionRedisTemplate.opsForValue().get(sessionKey);
            if (json != null && !json.isBlank()) {
                CustomerSession session = objectMapper.readValue(json, CustomerSession.class);
                sessionRedisTemplate.opsForSet().remove(CUSTOMER_SESSIONS_PREFIX + session.customerId(), sessionId);
            }
            sessionRedisTemplate.delete(sessionKey);
            log.info("Deleted customer session from Redis [sessionId={}]", sessionId);
        } catch (Exception e) {
            log.error("Error deleting session from Redis: {}", e.getMessage());
            throw new SessionServiceUnavailableException("Session service temporarily unavailable", e);
        }
    }

    /**
     * Deletes all sessions for a customer (on password change).
     */
    public void deleteAllSessionsForCustomer(Long customerId) {
        if (customerId == null) return;

        String userSetKey = CUSTOMER_SESSIONS_PREFIX + customerId;
        try {
            Set<String> sessionIds = sessionRedisTemplate.opsForSet().members(userSetKey);
            if (sessionIds != null && !sessionIds.isEmpty()) {
                for (String sid : sessionIds) {
                    sessionRedisTemplate.delete(SESSION_KEY_PREFIX + sid);
                }
            }
            sessionRedisTemplate.delete(userSetKey);
            log.info("Deleted all sessions for customer [customerId={}, count={}]",
                    customerId, sessionIds != null ? sessionIds.size() : 0);
        } catch (Exception e) {
            log.error("Error deleting all sessions for customer: {}", e.getMessage());
            throw new SessionServiceUnavailableException("Session service temporarily unavailable", e);
        }
    }
}
