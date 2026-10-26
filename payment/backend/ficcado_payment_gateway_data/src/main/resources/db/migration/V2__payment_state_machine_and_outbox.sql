-- =============================================================================
-- V2__payment_state_machine_and_outbox.sql
-- State Machine Enforcements, Outbox Events, and Optimistic Locking (P2-7)
-- =============================================================================

-- 1. Add optimistic locking version column to payment_transactions
ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0 NOT NULL;

-- 2. Add courier partner, delivery charge, and address reference columns
ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS courier_partner VARCHAR(100);

ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(12, 2) DEFAULT 0;

ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS address_id BIGINT;

-- 3. Create transactional Outbox Events table for atomic event publishing
CREATE TABLE IF NOT EXISTS outbox_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_status ON outbox_events(status);
CREATE INDEX IF NOT EXISTS idx_outbox_events_aggregate_id ON outbox_events(aggregate_id);
