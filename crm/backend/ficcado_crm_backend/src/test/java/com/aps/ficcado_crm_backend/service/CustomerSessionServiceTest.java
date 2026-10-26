package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.exception.SessionServiceUnavailableException;
import com.aps.ficcado_crm_backend.session.CustomerSession;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.RedisTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerSessionServiceTest {

    @Mock
    private RedisTemplate<String, String> sessionRedisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private SetOperations<String, String> setOperations;

    private ObjectMapper objectMapper;
    private CustomerSessionService customerSessionService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        customerSessionService = new CustomerSessionService(sessionRedisTemplate, objectMapper);
        customerSessionService.setIdleTimeoutSeconds(600);
    }

    @Test
    @DisplayName("1. createSession creates 256-bit SecureRandom hex session and stores in Redis with 600s TTL")
    void testCreateSession_StoresInRedisWithConfiguredTtl() {
        when(sessionRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(sessionRedisTemplate.opsForSet()).thenReturn(setOperations);

        CustomerSession session = customerSessionService.createSession(101L);

        assertThat(session).isNotNull();
        assertThat(session.customerId()).isEqualTo(101L);
        assertThat(session.sessionId()).hasSize(64); // 256 bits = 32 bytes = 64 hex chars
        assertThat(session.sessionId()).matches("^[0-9a-f]{64}$");

        verify(valueOperations).set(
                eq("session:cust:" + session.sessionId()),
                anyString(),
                eq(Duration.ofSeconds(600))
        );
        verify(setOperations).add(
                eq("cust:sessions:101"),
                eq(session.sessionId())
        );
    }

    @Test
    @DisplayName("2. validateSession with user-initiated request extends 600s sliding window atomically")
    void testActivity_ExtendsSlidingWindow() throws Exception {
        when(sessionRedisTemplate.opsForValue()).thenReturn(valueOperations);

        String sid = "a".repeat(64);
        CustomerSession existing = new CustomerSession(sid, 101L, Instant.now().minusSeconds(100), Instant.now().minusSeconds(100), null);
        String json = objectMapper.writeValueAsString(existing);

        when(valueOperations.get("session:cust:" + sid)).thenReturn(json);

        Optional<CustomerSession> validated = customerSessionService.validateSession(sid, true);

        assertThat(validated).isPresent();
        assertThat(validated.get().customerId()).isEqualTo(101L);

        // Verify TTL refreshed to 600s atomically
        verify(valueOperations).set(
                eq("session:cust:" + sid),
                anyString(),
                eq(Duration.ofSeconds(600))
        );
    }

    @Test
    @DisplayName("3. validateSession with background request (X-Ficcado-Background: 1) does NOT extend sliding window")
    void testBackgroundHeader_DoesNotExtendSlidingWindow() throws Exception {
        when(sessionRedisTemplate.opsForValue()).thenReturn(valueOperations);

        String sid = "b".repeat(64);
        CustomerSession existing = new CustomerSession(sid, 101L, Instant.now().minusSeconds(100), Instant.now().minusSeconds(100), null);
        String json = objectMapper.writeValueAsString(existing);

        when(valueOperations.get("session:cust:" + sid)).thenReturn(json);

        Optional<CustomerSession> validated = customerSessionService.validateSession(sid, false); // isUserInitiated = false

        assertThat(validated).isPresent();
        assertThat(validated.get().customerId()).isEqualTo(101L);

        // Verify opsForValue().set was NEVER called (no TTL refresh)
        verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("4. deleteSession deletes single session on customer logout")
    void testLogout_DeletesSessionFromRedis() throws Exception {
        when(sessionRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(sessionRedisTemplate.opsForSet()).thenReturn(setOperations);

        String sid = "c".repeat(64);
        CustomerSession existing = new CustomerSession(sid, 101L, Instant.now(), Instant.now(), null);
        when(valueOperations.get("session:cust:" + sid)).thenReturn(objectMapper.writeValueAsString(existing));

        customerSessionService.deleteSession(sid);

        verify(sessionRedisTemplate).delete("session:cust:" + sid);
        verify(setOperations).remove("cust:sessions:101", sid);
    }

    @Test
    @DisplayName("5. deleteAllSessionsForCustomer invalidates all sessions on password change")
    void testPasswordChange_DeletesAllSessionsForCustomer() {
        when(sessionRedisTemplate.opsForSet()).thenReturn(setOperations);

        String sid1 = "d1".repeat(32);
        String sid2 = "d2".repeat(32);
        when(setOperations.members("cust:sessions:101")).thenReturn(Set.of(sid1, sid2));

        customerSessionService.deleteAllSessionsForCustomer(101L);

        verify(sessionRedisTemplate).delete("session:cust:" + sid1);
        verify(sessionRedisTemplate).delete("session:cust:" + sid2);
        verify(sessionRedisTemplate).delete("cust:sessions:101");
    }

    @Test
    @DisplayName("6. Paused session for payment window counts as active without expiring")
    void testPausedSession_SurvivesAndCountsAsActive() throws Exception {
        when(sessionRedisTemplate.opsForValue()).thenReturn(valueOperations);

        String sid = "e".repeat(64);
        Instant pausedUntil = Instant.now().plusSeconds(900); // 15 mins
        CustomerSession pausedSession = new CustomerSession(sid, 101L, Instant.now().minusSeconds(1000), Instant.now().minusSeconds(1000), pausedUntil);

        when(valueOperations.get("session:cust:" + sid)).thenReturn(objectMapper.writeValueAsString(pausedSession));

        Optional<CustomerSession> validated = customerSessionService.validateSession(sid, true);

        assertThat(validated).isPresent();
        assertThat(validated.get().isPaused()).isTrue();
    }

    @Test
    @DisplayName("7. pauseSession clamps duration to 15 minutes max and sets pausedUntil")
    void testPauseSession_ClampedTo15Minutes() throws Exception {
        when(sessionRedisTemplate.opsForValue()).thenReturn(valueOperations);

        String sid = "f".repeat(64);
        CustomerSession existing = new CustomerSession(sid, 101L, Instant.now(), Instant.now(), null);
        when(valueOperations.get("session:cust:" + sid)).thenReturn(objectMapper.writeValueAsString(existing));

        Optional<CustomerSession> paused = customerSessionService.pauseSession(sid, 30); // Requested 30 mins, must clamp to 15

        assertThat(paused).isPresent();
        assertThat(paused.get().pausedUntil()).isNotNull();
        // Difference between now and pausedUntil should be approximately 15 minutes (900 seconds)
        long diffSeconds = Duration.between(Instant.now(), paused.get().pausedUntil()).toSeconds();
        assertThat(diffSeconds).isBetween(890L, 910L);
    }

    @Test
    @DisplayName("8. Redis down throws SessionServiceUnavailableException (503 fail-closed)")
    void testRedisDown_ThrowsSessionServiceUnavailableException_FailsClosed() {
        when(sessionRedisTemplate.opsForValue()).thenThrow(new RedisConnectionFailureException("Redis connection refused"));

        assertThatThrownBy(() -> customerSessionService.createSession(101L))
                .isInstanceOf(SessionServiceUnavailableException.class)
                .hasMessageContaining("Session service temporarily unavailable");

        assertThatThrownBy(() -> customerSessionService.validateSession("some-sid", true))
                .isInstanceOf(SessionServiceUnavailableException.class);

        assertThatThrownBy(() -> customerSessionService.getSession("some-sid"))
                .isInstanceOf(SessionServiceUnavailableException.class);
    }

    @Test
    @DisplayName("9. Tampered or non-existent session returns Optional.empty")
    void testTamperedOrNonExistentSession_ReturnsEmpty() {
        when(sessionRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("session:cust:unknown")).thenReturn(null);

        Optional<CustomerSession> session = customerSessionService.validateSession("unknown", true);
        assertThat(session).isEmpty();

        Optional<CustomerSession> readOnly = customerSessionService.getSession("unknown");
        assertThat(readOnly).isEmpty();

        assertThat(customerSessionService.validateSession(null, true)).isEmpty();
        assertThat(customerSessionService.validateSession("", true)).isEmpty();
    }

    @Test
    @DisplayName("10. touchSession refreshes session and returns updated remaining seconds")
    void testTouchSession_RefreshesSession() throws Exception {
        when(sessionRedisTemplate.opsForValue()).thenReturn(valueOperations);

        String sid = "g".repeat(64);
        CustomerSession existing = new CustomerSession(sid, 101L, Instant.now().minusSeconds(300), Instant.now().minusSeconds(300), null);
        when(valueOperations.get("session:cust:" + sid)).thenReturn(objectMapper.writeValueAsString(existing));

        Optional<CustomerSession> touched = customerSessionService.touchSession(sid);

        assertThat(touched).isPresent();
        verify(valueOperations).set(eq("session:cust:" + sid), anyString(), eq(Duration.ofSeconds(600)));
    }
}
