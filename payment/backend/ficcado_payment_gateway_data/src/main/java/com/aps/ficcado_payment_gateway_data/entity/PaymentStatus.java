package com.aps.ficcado_payment_gateway_data.entity;

import java.util.Set;

/**
 * Strict Payment State Machine Statuses (Part 2 Phase P2-7).
 *
 * Allowed transitions:
 * - CREATED -> PROCESSING, FAILED, EXPIRED
 * - PROCESSING -> COMPLETED, REFUND_PENDING, FAILED
 * - REFUND_PENDING -> REFUNDED
 * - COMPLETED, FAILED, REFUNDED, EXPIRED are terminal.
 */
public enum PaymentStatus {
    CREATED,
    PROCESSING,
    COMPLETED,
    FAILED,
    REFUND_PENDING,
    REFUNDED,
    EXPIRED;

    public boolean canTransitionTo(PaymentStatus target) {
        if (this == target) {
            return true; // Idempotent no-op
        }
        return switch (this) {
            case CREATED -> target == PROCESSING || target == FAILED || target == EXPIRED;
            case PROCESSING -> target == COMPLETED || target == REFUND_PENDING || target == FAILED;
            case REFUND_PENDING -> target == REFUNDED;
            case COMPLETED, FAILED, REFUNDED, EXPIRED -> false;
        };
    }
}
