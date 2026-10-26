package com.aps.ficcado_payment_gateway_data.client;

import lombok.extern.slf4j.Slf4j;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Thread-safe Circuit Breaker for Razorpay API calls (Part 2 Phase P2-8).
 * States:
 * - CLOSED: Normal operation. Success resets failure counter.
 * - OPEN: 5 consecutive failures trips the circuit breaker for 30 seconds.
 * - HALF_OPEN: After 30 seconds, allows a single probe call. Success resets to CLOSED; failure trips back to OPEN.
 */
@Slf4j
public class CircuitBreaker {

    public enum State {
        CLOSED,
        OPEN,
        HALF_OPEN
    }

    private final int failureThreshold;
    private final long openDurationMs;

    private final AtomicReference<State> state = new AtomicReference<>(State.CLOSED);
    private final AtomicInteger failureCount = new AtomicInteger(0);
    private final AtomicLong lastStateChangeTime = new AtomicLong(System.currentTimeMillis());

    public CircuitBreaker(int failureThreshold, long openDurationMs) {
        this.failureThreshold = failureThreshold;
        this.openDurationMs = openDurationMs;
    }

    public State getState() {
        checkHalfOpenTransition();
        return state.get();
    }

    public boolean allowExecution() {
        checkHalfOpenTransition();
        State current = state.get();
        return current == State.CLOSED || current == State.HALF_OPEN;
    }

    public void recordSuccess() {
        State current = state.get();
        if (current == State.HALF_OPEN) {
            log.info("Circuit breaker probe succeeded. Transitioning from HALF_OPEN to CLOSED.");
        }
        state.set(State.CLOSED);
        failureCount.set(0);
        lastStateChangeTime.set(System.currentTimeMillis());
    }

    public void recordFailure() {
        State current = state.get();
        if (current == State.HALF_OPEN) {
            log.warn("Circuit breaker probe failed in HALF_OPEN. Tripping back to OPEN.");
            state.set(State.OPEN);
            lastStateChangeTime.set(System.currentTimeMillis());
            return;
        }

        int failures = failureCount.incrementAndGet();
        if (failures >= failureThreshold) {
            if (state.compareAndSet(State.CLOSED, State.OPEN)) {
                log.error("Circuit breaker tripped to OPEN after {} consecutive failures! Blocking calls for {} ms.",
                        failures, openDurationMs);
                lastStateChangeTime.set(System.currentTimeMillis());
            }
        }
    }

    private void checkHalfOpenTransition() {
        if (state.get() == State.OPEN) {
            long elapsed = System.currentTimeMillis() - lastStateChangeTime.get();
            if (elapsed >= openDurationMs) {
                if (state.compareAndSet(State.OPEN, State.HALF_OPEN)) {
                    log.info("Circuit breaker open duration elapsed ({} ms). Transitioning to HALF_OPEN to test recovery.",
                            elapsed);
                    lastStateChangeTime.set(System.currentTimeMillis());
                }
            }
        }
    }

    public void reset() {
        state.set(State.CLOSED);
        failureCount.set(0);
        lastStateChangeTime.set(System.currentTimeMillis());
    }
}
