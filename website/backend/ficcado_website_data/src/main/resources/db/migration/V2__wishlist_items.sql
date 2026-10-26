-- =============================================================================
-- Ficcado Website Data — V2 Schema Migration: Wishlist Items
-- Owns customer wishlist items.
-- Strict Microservices Separation: No FK constraints to Ficcado-Data (different DB).
-- =============================================================================

CREATE TABLE IF NOT EXISTS wishlist_items (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wishlist_customer_item UNIQUE (customer_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_customer_id ON wishlist_items(customer_id);
