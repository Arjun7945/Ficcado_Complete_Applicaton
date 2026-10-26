package com.aps.ficcado_payment_gateway_data;

import com.aps.ficcado_payment_gateway_data.client.CircuitBreaker;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CircuitBreakerTest {

    @Test
    @DisplayName("CircuitBreaker transitions CLOSED -> OPEN after failure threshold")
    void transitionsToOpenAfterThreshold() {
        CircuitBreaker cb = new CircuitBreaker(5, 100);

        assertEquals(CircuitBreaker.State.CLOSED, cb.getState());
        assertTrue(cb.allowExecution());

        // 4 failures
        for (int i = 0; i < 4; i++) {
            cb.recordFailure();
            assertEquals(CircuitBreaker.State.CLOSED, cb.getState());
            assertTrue(cb.allowExecution());
        }

        // 5th failure -> trips to OPEN
        cb.recordFailure();
        assertEquals(CircuitBreaker.State.OPEN, cb.getState());
        assertFalse(cb.allowExecution());
    }

    @Test
    @DisplayName("CircuitBreaker recovers from OPEN -> HALF_OPEN -> CLOSED on successful probe")
    void recoversToClosedOnSuccessfulProbe() throws InterruptedException {
        CircuitBreaker cb = new CircuitBreaker(3, 50);

        for (int i = 0; i < 3; i++) {
            cb.recordFailure();
        }
        assertEquals(CircuitBreaker.State.OPEN, cb.getState());
        assertFalse(cb.allowExecution());

        // Wait for open duration
        Thread.sleep(60);

        // State moves to HALF_OPEN and allows probe execution
        assertEquals(CircuitBreaker.State.HALF_OPEN, cb.getState());
        assertTrue(cb.allowExecution());

        // Record successful probe
        cb.recordSuccess();
        assertEquals(CircuitBreaker.State.CLOSED, cb.getState());
        assertTrue(cb.allowExecution());
    }

    @Test
    @DisplayName("CircuitBreaker trips back to OPEN if probe fails in HALF_OPEN")
    void tripsBackToOpenIfProbeFails() throws InterruptedException {
        CircuitBreaker cb = new CircuitBreaker(2, 50);

        cb.recordFailure();
        cb.recordFailure();
        assertEquals(CircuitBreaker.State.OPEN, cb.getState());

        Thread.sleep(60);
        assertEquals(CircuitBreaker.State.HALF_OPEN, cb.getState());

        // Probe fails
        cb.recordFailure();
        assertEquals(CircuitBreaker.State.OPEN, cb.getState());
        assertFalse(cb.allowExecution());
    }

    @Test
    @DisplayName("Reset restores CLOSED state and clears failure counter")
    void resetRestoresClosedState() {
        CircuitBreaker cb = new CircuitBreaker(3, 1000);
        cb.recordFailure();
        cb.recordFailure();
        cb.recordFailure();
        assertEquals(CircuitBreaker.State.OPEN, cb.getState());

        cb.reset();
        assertEquals(CircuitBreaker.State.CLOSED, cb.getState());
        assertTrue(cb.allowExecution());
    }
}
