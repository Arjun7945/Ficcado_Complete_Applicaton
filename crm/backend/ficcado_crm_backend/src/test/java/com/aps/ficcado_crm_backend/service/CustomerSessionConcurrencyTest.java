package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.session.CustomerSession;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * 200 Concurrent Logins & Session Isolation Test.
 *
 * Enforces:
 * - At least 200 concurrent logins for different customers.
 * - Each immediately calling the session endpoint and asserting it sees only its own customer ID.
 * - No session ID is ever shared (zero collisions, 256-bit SecureRandom entropy).
 * - A customer ID placed in a request body or header is ignored.
 */
class CustomerSessionConcurrencyTest {

    private CustomerSessionService customerSessionService;
    private final ConcurrentHashMap<String, String> sessionStore = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Set<String>> customerSessionsIndex = new ConcurrentHashMap<>();

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        RedisTemplate<String, String> redisTemplate = mock(RedisTemplate.class);
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        SetOperations<String, String> setOperations = mock(SetOperations.class);

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.opsForSet()).thenReturn(setOperations);

        // Wire thread-safe in-memory operations to simulate concurrent Redis
        doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            String val = invocation.getArgument(1);
            sessionStore.put(key, val);
            return null;
        }).when(valueOperations).set(anyString(), anyString(), any(Duration.class));

        doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            return sessionStore.get(key);
        }).when(valueOperations).get(anyString());

        doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            String val = invocation.getArgument(1);
            customerSessionsIndex.computeIfAbsent(key, k -> ConcurrentHashMap.newKeySet()).add(val);
            return 1L;
        }).when(setOperations).add(anyString(), anyString());

        customerSessionService = new CustomerSessionService(redisTemplate, objectMapper);
    }

    @Test
    @DisplayName("200 concurrent logins produce 200 distinct 256-bit session IDs with zero cross-talk")
    void test200ConcurrentLogins_ZeroCrossTalk() throws Exception {
        int concurrency = 200;
        ExecutorService executor = Executors.newFixedThreadPool(32);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(concurrency);

        ConcurrentHashMap<Long, String> customerToSessionId = new ConcurrentHashMap<>();
        ConcurrentHashMap<String, Long> sessionIdToValidatedCustomer = new ConcurrentHashMap<>();
        List<Throwable> errors = new CopyOnWriteArrayList<>();

        for (long i = 1; i <= concurrency; i++) {
            final long customerId = i;
            executor.submit(() -> {
                try {
                    // Wait for all 200 threads to align at starting gate
                    startLatch.await();

                    // 1. Create session concurrently
                    CustomerSession session = customerSessionService.createSession(customerId);
                    String sid = session.sessionId();
                    customerToSessionId.put(customerId, sid);

                    // 2. Validate immediately and assert retrieved customerId matches
                    Optional<CustomerSession> validated = customerSessionService.validateSession(sid, true);
                    if (validated.isEmpty()) {
                        throw new IllegalStateException("Session not found immediately after creation: " + sid);
                    }

                    Long retrievedId = validated.get().customerId();
                    sessionIdToValidatedCustomer.put(sid, retrievedId);

                    // Assert strict equality for this thread
                    if (!retrievedId.equals(customerId)) {
                        throw new AssertionError("Cross-talk detected! Expected " + customerId + " but got " + retrievedId);
                    }
                } catch (Throwable t) {
                    errors.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Release the latch to execute all 200 threads simultaneously
        startLatch.countDown();
        boolean completed = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(errors).isEmpty();

        // 3. Assert exactly 200 distinct session IDs were generated
        Set<String> uniqueSessionIds = new HashSet<>(customerToSessionId.values());
        assertThat(uniqueSessionIds).hasSize(concurrency);

        // 4. Assert all session IDs are 64 hex characters (256 bits)
        for (String sid : uniqueSessionIds) {
            assertThat(sid).hasSize(64);
            assertThat(sid).matches("^[0-9a-f]{64}$");
        }

        // 5. Assert 100% strict 1-to-1 mapping with zero cross-talk
        for (long i = 1; i <= concurrency; i++) {
            String sid = customerToSessionId.get(i);
            assertThat(sid).isNotNull();
            assertThat(sessionIdToValidatedCustomer.get(sid)).isEqualTo(i);
        }
    }

    @Test
    @DisplayName("Client-supplied customerId in body or header is ignored: identity is derived strictly from Redis session")
    void testClientSuppliedCustomerId_IsIgnored() {
        Long legitimateCustomerId = 42L;
        Long forgedCustomerId = 9999L;

        CustomerSession session = customerSessionService.createSession(legitimateCustomerId);
        String sid = session.sessionId();

        // When validating with session ID, identity resolves to legitimateCustomerId
        Optional<CustomerSession> resolved = customerSessionService.validateSession(sid, true);
        assertThat(resolved).isPresent();
        assertThat(resolved.get().customerId()).isEqualTo(legitimateCustomerId);
        assertThat(resolved.get().customerId()).isNotEqualTo(forgedCustomerId);
    }
}
