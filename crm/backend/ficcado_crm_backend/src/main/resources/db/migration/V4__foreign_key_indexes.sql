-- =============================================================================
-- V4__foreign_key_indexes.sql
-- Part 2, AUD-12: Database Indexes on Foreign Keys for Query Performance
--
-- Explicit indexes on hot foreign-key lookup columns:
-- 1. sale_line_items.sale_id
-- 2. sales.customer_id
-- 3. inventory_history.item_id
--
-- Uses CREATE INDEX IF NOT EXISTS (plain syntax) to be safe for re-runs.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_sale_line_items_sale_id ON sale_line_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_item_id ON inventory_history(item_id);
