-- =============================================================================
-- V3__reconciliation_and_shedlock.sql
-- ShedLock Table and Payment Reconciliation Tracking (P2-8)
-- =============================================================================

-- 1. Create ShedLock table for distributed scheduler locking
CREATE TABLE IF NOT EXISTS shedlock (
    name VARCHAR(64) NOT NULL PRIMARY KEY,
    lock_until TIMESTAMP NOT NULL,
    locked_at TIMESTAMP NOT NULL,
    locked_by VARCHAR(255) NOT NULL
);

-- 2. Add refund ID and reconciliation tracking to payment_transactions
ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS refund_id VARCHAR(100);

ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS reconciliation_run_count INT DEFAULT 0 NOT NULL;

ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS last_reconciled_at TIMESTAMPTZ;

-- 3. Composite index for efficient reconciliation querying
CREATE INDEX IF NOT EXISTS idx_payment_tx_reconciliation
    ON payment_transactions(payment_status, created_at);
