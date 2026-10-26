-- =============================================================================
-- V3__order_notifications.sql
-- Idempotent Order Notifications Table (Part 2 Phase P2-7)
-- =============================================================================

CREATE TABLE IF NOT EXISTS order_notifications (
    id BIGSERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    razorpay_order_id VARCHAR(100),
    order_status VARCHAR(50) NOT NULL,
    invoice_number VARCHAR(100),
    sale_id BIGINT,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    amount NUMERIC(12, 2),
    message TEXT,
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_notifications_tx_id ON order_notifications(transaction_id);
CREATE INDEX IF NOT EXISTS idx_order_notifications_email ON order_notifications(customer_email);
