-- =============================================================================
-- V1: Ficcado Inventory & Sales Management — Complete Schema (Fresh Start)
-- =============================================================================
-- All tables, indexes, constraints and columns for Parts 1–13.
-- This is the ONE migration that creates everything from scratch.
-- No ALTER TABLE migrations follow — all columns are here from the start.
--
-- Covers:
--   Parts 1–12 : Core CRM schema (admins, items, inventory, sales, etc.)
--   Part 13 §1 : Performance indexes on every FK + frequent lookup column
--   Part 13 §3 : revoked_tokens — server-side JWT denylist for per-device logout
--   Part 13 §5 : Customer e-commerce prep columns (nullable, no CRM impact)
--   Part 13 §6 : item_images — multi-image support with Cloudflare R2
--   Part 13 §8 : reviews + review_tokens — tokenized star-rating submissions
--   Part 13 §8 : average_rating / review_count denormalized on items
-- =============================================================================

-- ─── 1. admins ───────────────────────────────────────────────────────────────
CREATE TABLE admins (
    id                  BIGSERIAL    PRIMARY KEY,
    admin_name          VARCHAR(255) NOT NULL,
    phone_number        VARCHAR(50),
    email_id            VARCHAR(255) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    role                VARCHAR(50)  NOT NULL DEFAULT 'ADMIN',
                        -- values: SUPERADMIN | ADMIN
    notifications       VARCHAR(20)  NOT NULL DEFAULT 'ENABLED',
                        -- values: ENABLED | DISABLED
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by_admin_id BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by_admin_id BIGINT       REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX idx_admins_email      ON admins(email_id);
CREATE INDEX idx_admins_is_active  ON admins(is_active);

-- ─── 2. items ────────────────────────────────────────────────────────────────
CREATE TABLE items (
    id                  BIGSERIAL    PRIMARY KEY,
    item_name           VARCHAR(255) NOT NULL,
    item_type           VARCHAR(100),
    price_of_item       NUMERIC(12,2),
    cost_price          NUMERIC(12,2),
    current_status      VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
                        -- values: ACTIVE | INACTIVE
    -- ── Review aggregates (Part 13 §8) ─────────────────────────────────────
    -- Denormalized for fast display; updated atomically with each review insert.
    average_rating      NUMERIC(3,2)          DEFAULT 0.00,
                        -- 0.00 = no reviews yet; range: 0.00–5.00
    review_count        INT          NOT NULL  DEFAULT 0,
                        -- total reviews submitted for this item
    -- ── Audit ──────────────────────────────────────────────────────────────
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by_admin_id BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by_admin_id BIGINT       REFERENCES admins(id) ON DELETE SET NULL
);

-- Item sizes — child table (replaces comma-separated available_sizes column)
CREATE TABLE item_sizes (
    id      BIGSERIAL    PRIMARY KEY,
    item_id BIGINT       NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    size    VARCHAR(50)  NOT NULL,
    UNIQUE (item_id, size)
);

CREATE INDEX idx_items_name        ON items(item_name);
CREATE INDEX idx_items_status      ON items(current_status);
CREATE INDEX idx_item_sizes_item   ON item_sizes(item_id);

-- ─── 3. item_images (Part 13 §6) ─────────────────────────────────────────────
-- Stores URLs for images uploaded to Cloudflare R2.
-- display_order = 1 is the cover image shown as thumbnail across the CRM.
CREATE TABLE item_images (
    id              BIGSERIAL    PRIMARY KEY,
    item_id         BIGINT       NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    image_url       TEXT         NOT NULL,       -- full-resolution URL (R2)
    thumbnail_url   TEXT         NOT NULL,       -- small thumbnail URL (R2)
    caption         VARCHAR(500),                -- optional admin-entered caption
    display_order   INT          NOT NULL DEFAULT 1,
                                 -- position-1 is the item's cover image
    uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    uploaded_by     BIGINT       REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX idx_item_images_item_order ON item_images(item_id, display_order);
CREATE INDEX idx_item_images_item       ON item_images(item_id);

-- ─── 4. inventory ────────────────────────────────────────────────────────────
CREATE TABLE inventory (
    id                    BIGSERIAL    PRIMARY KEY,
    item_id               BIGINT       NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    size                  VARCHAR(50)  NOT NULL,
    total_quantity        INT          NOT NULL DEFAULT 0,
    current_status        VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    added_by_admin_id     BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by_admin_id   BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    UNIQUE (item_id, size)
);

CREATE INDEX idx_inventory_item        ON inventory(item_id);
CREATE INDEX idx_inventory_item_size   ON inventory(item_id, size);
CREATE INDEX idx_inventory_status      ON inventory(current_status);

-- ─── 5. warehouse_allocations ────────────────────────────────────────────────
CREATE TABLE warehouse_allocations (
    id                  BIGSERIAL    PRIMARY KEY,
    warehouse_location  VARCHAR(255) NOT NULL,
    handler_admin_id    BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
                        -- FK replaces plain handler_name string
    item_id             BIGINT       NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    size                VARCHAR(50)  NOT NULL,
    quantity            INT          NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by_admin_id BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by_admin_id BIGINT       REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX idx_warehouse_handler    ON warehouse_allocations(handler_admin_id);
CREATE INDEX idx_warehouse_item       ON warehouse_allocations(item_id);
CREATE INDEX idx_warehouse_created_by ON warehouse_allocations(created_by_admin_id);

-- ─── 6. customers ────────────────────────────────────────────────────────────
CREATE TABLE customers (
    id                  BIGSERIAL    PRIMARY KEY,
    customer_name       VARCHAR(255) NOT NULL,
    phone_number        VARCHAR(50)  NOT NULL UNIQUE,
    email_id            VARCHAR(255),
    total_orders_placed INT          NOT NULL DEFAULT 0,
    -- invoice_numbers intentionally NOT stored; derived by querying sales.customer_id
    -- ── E-commerce preparation columns (Part 13 §5) — all nullable ────────
    -- Populated when a customer registers on the future public website.
    -- Zero impact on current CRM functionality.
    password_hash       VARCHAR(255),
                        -- bcrypt hash; NULL until customer registers on website
    email_verified_at   TIMESTAMPTZ,
                        -- NULL until customer verifies their email address
    phone_verified_at   TIMESTAMPTZ,
                        -- NULL until customer verifies their phone number
    -- ── Audit ──────────────────────────────────────────────────────────────
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by_admin_id BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by_admin_id BIGINT       REFERENCES admins(id) ON DELETE SET NULL
);

-- Customer addresses — child table (replaces flat TEXT address column)
CREATE TABLE customer_addresses (
    id          BIGSERIAL    PRIMARY KEY,
    customer_id BIGINT       NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    address     TEXT         NOT NULL,
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_phone        ON customers(phone_number);
CREATE INDEX idx_customers_created_by   ON customers(created_by_admin_id);
CREATE INDEX idx_customer_addr_cust     ON customer_addresses(customer_id);
-- Partial unique index on email — allows multiple NULL emails (existing customers
-- without email don't conflict), but enforces uniqueness when email IS set.
-- This supports email as primary login identifier for the future website.
CREATE UNIQUE INDEX idx_customers_email_unique
    ON customers(email_id)
    WHERE email_id IS NOT NULL;

-- ─── 7. sales ────────────────────────────────────────────────────────────────
CREATE TABLE sales (
    id                        BIGSERIAL    PRIMARY KEY,
    invoice_number            VARCHAR(100) NOT NULL UNIQUE,
    customer_id               BIGINT       REFERENCES customers(id) ON DELETE SET NULL,
    customer_name             VARCHAR(255) NOT NULL,   -- denormalized snapshot at time of sale
    customer_phone_number     VARCHAR(50),
    customer_address          TEXT,
    customer_email            VARCHAR(255),
    sale_status               VARCHAR(100) NOT NULL DEFAULT 'COMPLETED',
                              -- COMPLETED | REPLACE_REQUESTED | REFUND_REQUESTED
                              -- | PURCHASE_SATISFIED_AND_ORDER_COMPLETED
    payment_status            VARCHAR(50)  NOT NULL DEFAULT 'PAID',
                              -- PAID | UNPAID | PARTIALLY_PAID
    mode_of_payment           VARCHAR(50),
    transaction_id            VARCHAR(100),
    delivery_status           VARCHAR(100) NOT NULL DEFAULT 'DELIVERED',
                              -- DELIVERED | PENDING | IN_TRANSIT | FAILED | RETURNED
                              -- | ORDER_DELIVERED_SUCCESSFULLY
    delivery_charge_enabled   BOOLEAN      NOT NULL DEFAULT FALSE,
    delivery_charge_amount    NUMERIC(12,2)         DEFAULT 0.00,
    fulfilment_request_status VARCHAR(100),
    fulfilment_source         VARCHAR(100),
                              -- TAKE_FROM_INVENTORY | WAREHOUSE_HANDLER
    discount                  NUMERIC(12,2)         DEFAULT 0.00,
    total_amount              NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sale_closed_by_admin_id   BIGINT        REFERENCES admins(id) ON DELETE SET NULL,
    received_by               VARCHAR(255),
    remarks                   TEXT,
    version                   INT           NOT NULL DEFAULT 1,
    created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_by_admin_id       BIGINT        REFERENCES admins(id) ON DELETE SET NULL,
    updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_by_admin_id       BIGINT        REFERENCES admins(id) ON DELETE SET NULL
);

-- Sale line items — child table (replaces comma-separated item/size/qty/price columns)
CREATE TABLE sale_line_items (
    id          BIGSERIAL    PRIMARY KEY,
    sale_id     BIGINT       NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    item_id     BIGINT       REFERENCES items(id) ON DELETE SET NULL,
    item_name   VARCHAR(255) NOT NULL,  -- snapshot at time of sale
    size        VARCHAR(50)  NOT NULL,
    quantity    INT          NOT NULL DEFAULT 1,
    price_each  NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

CREATE INDEX idx_sales_invoice          ON sales(invoice_number);
CREATE INDEX idx_sales_customer         ON sales(customer_id);
CREATE INDEX idx_sales_status           ON sales(sale_status);
CREATE INDEX idx_sales_created_at       ON sales(created_at);
CREATE INDEX idx_sales_payment_status   ON sales(payment_status);
CREATE INDEX idx_sales_delivery_status  ON sales(delivery_status);
CREATE INDEX idx_sales_closed_by        ON sales(sale_closed_by_admin_id);
CREATE INDEX idx_sales_created_by       ON sales(created_by_admin_id);
CREATE INDEX idx_sale_line_items_sale   ON sale_line_items(sale_id);
CREATE INDEX idx_sale_line_items_item   ON sale_line_items(item_id);

-- ─── 8. replacements ─────────────────────────────────────────────────────────
CREATE TABLE replacements (
    id                       BIGSERIAL    PRIMARY KEY,
    sale_id                  BIGINT       NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
    invoice_number           VARCHAR(100) NOT NULL,   -- snapshot for display
    invoice_status           VARCHAR(100) NOT NULL DEFAULT 'APPROVED',
                             -- APPROVED | DISPATCHED | RECEIVED | SATISFIED_COMPLETED
    disposition_of_old_items VARCHAR(100),
                             -- RETURNED_TO_INVENTORY | SENT_TO_DAMAGED_PRODUCTS
    restock_destination      VARCHAR(100),
    new_stock_source         VARCHAR(100),
                             -- TAKE_FROM_INVENTORY | WAREHOUSE_HANDLER
    new_delivery_charge      NUMERIC(12,2) DEFAULT 0.00,
    new_discount             NUMERIC(12,2) DEFAULT 0.00,
    new_total_amount         NUMERIC(12,2) DEFAULT 0.00,
    version                  INT          NOT NULL DEFAULT 1,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by_admin_id      BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by_admin_id      BIGINT       REFERENCES admins(id) ON DELETE SET NULL
);

-- Replacement old items (items being returned by customer)
CREATE TABLE replacement_old_items (
    id              BIGSERIAL    PRIMARY KEY,
    replacement_id  BIGINT       NOT NULL REFERENCES replacements(id) ON DELETE CASCADE,
    item_id         BIGINT       REFERENCES items(id) ON DELETE SET NULL,
    item_name       VARCHAR(255) NOT NULL,
    size            VARCHAR(50)  NOT NULL,
    quantity        INT          NOT NULL DEFAULT 1
);

-- Replacement new items (items being sent to customer)
CREATE TABLE replacement_new_items (
    id              BIGSERIAL    PRIMARY KEY,
    replacement_id  BIGINT       NOT NULL REFERENCES replacements(id) ON DELETE CASCADE,
    item_id         BIGINT       REFERENCES items(id) ON DELETE SET NULL,
    item_name       VARCHAR(255) NOT NULL,
    size            VARCHAR(50)  NOT NULL,
    quantity        INT          NOT NULL DEFAULT 1,
    price_each      NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_price     NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

CREATE INDEX idx_replacements_sale          ON replacements(sale_id);
CREATE INDEX idx_replacements_created_by    ON replacements(created_by_admin_id);
CREATE INDEX idx_replacements_invoice_status ON replacements(invoice_status);
CREATE INDEX idx_replacement_old_rep        ON replacement_old_items(replacement_id);
CREATE INDEX idx_replacement_old_item       ON replacement_old_items(item_id);
CREATE INDEX idx_replacement_new_rep        ON replacement_new_items(replacement_id);
CREATE INDEX idx_replacement_new_item       ON replacement_new_items(item_id);

-- ─── 9. return_refunds ───────────────────────────────────────────────────────
CREATE TABLE return_refunds (
    id                           BIGSERIAL    PRIMARY KEY,
    sale_id                      BIGINT       NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
    invoice_number               VARCHAR(100) NOT NULL,   -- snapshot
    item_verification_status     VARCHAR(100),
                                 -- PENDING | VERIFIED | REJECTED
    refund_status                VARCHAR(100) NOT NULL DEFAULT 'PENDING',
                                 -- PENDING | IN_PROGRESS | COMPLETED | CLOSED
    refund_amount                NUMERIC(12,2)         DEFAULT 0.00,
    refund_completed_date_time   TIMESTAMPTZ,
    transaction_id               VARCHAR(100),
    mode_of_refund               VARCHAR(50),
    disposition_of_returned_items VARCHAR(100),
                                 -- RETURNED_TO_INVENTORY | SENT_TO_DAMAGED_PRODUCTS
    restock_destination          VARCHAR(100),
    price_charged_returned_items NUMERIC(12,2) DEFAULT 0.00,
    new_discount_applied         NUMERIC(12,2) DEFAULT 0.00,
    reason_for_return            TEXT,
    closed_by_admin_id           BIGINT        REFERENCES admins(id) ON DELETE SET NULL,
    version                      INT           NOT NULL DEFAULT 1,
    created_at                   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_by_admin_id          BIGINT        REFERENCES admins(id) ON DELETE SET NULL,
    updated_at                   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_by_admin_id          BIGINT        REFERENCES admins(id) ON DELETE SET NULL
);

-- Return/refund items (the actual items the customer is returning)
CREATE TABLE return_refund_items (
    id               BIGSERIAL    PRIMARY KEY,
    return_refund_id BIGINT       NOT NULL REFERENCES return_refunds(id) ON DELETE CASCADE,
    item_id          BIGINT       REFERENCES items(id) ON DELETE SET NULL,
    item_name        VARCHAR(255) NOT NULL,
    size             VARCHAR(50)  NOT NULL,
    quantity         INT          NOT NULL DEFAULT 1,
    price_each       NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_price      NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

CREATE INDEX idx_return_refunds_sale         ON return_refunds(sale_id);
CREATE INDEX idx_return_refunds_created_by   ON return_refunds(created_by_admin_id);
CREATE INDEX idx_return_refunds_refund_status ON return_refunds(refund_status);
CREATE INDEX idx_return_refund_items_rr      ON return_refund_items(return_refund_id);
CREATE INDEX idx_return_refund_items_item    ON return_refund_items(item_id);

-- ─── 10. damaged_products ────────────────────────────────────────────────────
CREATE TABLE damaged_products (
    id                  BIGSERIAL    PRIMARY KEY,
    invoice_number      VARCHAR(100),
    sale_id             BIGINT       REFERENCES sales(id) ON DELETE SET NULL,
    item_id             BIGINT       REFERENCES items(id) ON DELETE SET NULL,
    item_name           VARCHAR(255) NOT NULL,
    size                VARCHAR(50),
    quantity            INT          NOT NULL DEFAULT 1,
    customer_name       VARCHAR(255),
    reason_notes        TEXT,
    source              VARCHAR(100),
                        -- REPLACEMENT | RETURN_REFUND | MANUAL
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by_admin_id BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by_admin_id BIGINT       REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX idx_damaged_sale       ON damaged_products(sale_id);
CREATE INDEX idx_damaged_item       ON damaged_products(item_id);
CREATE INDEX idx_damaged_created_at ON damaged_products(created_at);

-- ─── 11. expenses ────────────────────────────────────────────────────────────
CREATE TABLE expenses (
    id                  BIGSERIAL    PRIMARY KEY,
    admin_id            BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    admin_name          VARCHAR(255) NOT NULL,   -- snapshot
    expense_category    VARCHAR(100) NOT NULL,
    custom_category     VARCHAR(100),
    description         TEXT,
    amount              NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    date_of_expense     DATE,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_by_admin_id BIGINT        REFERENCES admins(id) ON DELETE SET NULL,
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_by_admin_id BIGINT        REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX idx_expenses_admin       ON expenses(admin_id);
CREATE INDEX idx_expenses_date        ON expenses(date_of_expense);
CREATE INDEX idx_expenses_created_at  ON expenses(created_at);
CREATE INDEX idx_expenses_created_by  ON expenses(created_by_admin_id);

-- ─── 12. vendors ─────────────────────────────────────────────────────────────
CREATE TABLE vendors (
    id                  BIGSERIAL    PRIMARY KEY,
    vendor_name         VARCHAR(255) NOT NULL,
    vendor_type         VARCHAR(100),
    custom_vendor_type  VARCHAR(100),
    email_id            VARCHAR(255),
    purpose_use         TEXT,
    total_amount_paid   NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_by_admin_id BIGINT        REFERENCES admins(id) ON DELETE SET NULL,
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_by_admin_id BIGINT        REFERENCES admins(id) ON DELETE SET NULL
);

-- Vendor contact numbers — child table (replaces comma-separated contact_numbers column)
CREATE TABLE vendor_contact_numbers (
    id             BIGSERIAL    PRIMARY KEY,
    vendor_id      BIGINT       NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    contact_number VARCHAR(50)  NOT NULL
);

CREATE INDEX idx_vendors_name           ON vendors(vendor_name);
CREATE INDEX idx_vendor_contacts_vendor ON vendor_contact_numbers(vendor_id);

-- ─── 13. vendor_payments ─────────────────────────────────────────────────────
CREATE TABLE vendor_payments (
    id                  BIGSERIAL    PRIMARY KEY,
    vendor_id           BIGINT       NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    vendor_name         VARCHAR(255) NOT NULL,   -- snapshot
    amount              NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_date        DATE,
    note                TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by_admin_id BIGINT       REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX idx_vendor_payments_vendor     ON vendor_payments(vendor_id);
CREATE INDEX idx_vendor_payments_date       ON vendor_payments(payment_date);
CREATE INDEX idx_vendor_payments_created_by ON vendor_payments(created_by_admin_id);

-- ─── 14. activity_logs ───────────────────────────────────────────────────────
CREATE TABLE activity_logs (
    id          BIGSERIAL    PRIMARY KEY,
    admin_id    BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    admin_name  VARCHAR(255),   -- snapshot for display even if admin is deleted
    action      VARCHAR(100) NOT NULL,
    module      VARCHAR(100),
    module_key  VARCHAR(100),
    record_id   VARCHAR(100),
    message     TEXT,
    logged_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_admin      ON activity_logs(admin_id);
CREATE INDEX idx_activity_logs_logged_at  ON activity_logs(logged_at);
CREATE INDEX idx_activity_logs_module     ON activity_logs(module);
CREATE INDEX idx_activity_logs_admin_date ON activity_logs(admin_id, logged_at DESC);

-- ─── 15. sales_logs ──────────────────────────────────────────────────────────
CREATE TABLE sales_logs (
    id                     BIGSERIAL    PRIMARY KEY,
    module                 VARCHAR(100) NOT NULL,
    operation              VARCHAR(100) NOT NULL,
    related_invoice_number VARCHAR(100),
    log_message            TEXT,
    admin_id               BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    admin_name             VARCHAR(255),   -- snapshot
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_logs_invoice    ON sales_logs(related_invoice_number);
CREATE INDEX idx_sales_logs_created_at ON sales_logs(created_at);
CREATE INDEX idx_sales_logs_admin      ON sales_logs(admin_id);
CREATE INDEX idx_sales_logs_module     ON sales_logs(module);

-- ─── 16. inventory_history ───────────────────────────────────────────────────
CREATE TABLE inventory_history (
    id                      BIGSERIAL    PRIMARY KEY,
    item_id                 BIGINT       REFERENCES items(id) ON DELETE SET NULL,
    item_name               VARCHAR(255) NOT NULL,   -- snapshot
    size                    VARCHAR(50),
    quantity_change         INT          NOT NULL,
    affected_location       VARCHAR(100),
                            -- INVENTORY | WAREHOUSE
    handler_admin_id        BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    transaction_type        VARCHAR(100),
                            -- SALE | REPLACEMENT | RETURN_REFUND | MANUAL_ADJUSTMENT
                            -- | WAREHOUSE_ALLOCATION | WAREHOUSE_DEALLOCATION | DAMAGED_DISPOSAL
    related_invoice_number  VARCHAR(100),
    resulting_balance       INT,          -- NULL / N/A for DAMAGED_DISPOSAL
    resulting_balance_note  VARCHAR(255), -- e.g. "N/A — sent to Damaged Products"
    notes                   TEXT,
    admin_id                BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    admin_name              VARCHAR(255),   -- snapshot
    logged_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_history_item      ON inventory_history(item_id);
CREATE INDEX idx_inventory_history_logged_at ON inventory_history(logged_at);
CREATE INDEX idx_inventory_history_handler   ON inventory_history(handler_admin_id);
CREATE INDEX idx_inventory_history_admin     ON inventory_history(admin_id);
CREATE INDEX idx_inventory_history_item_date ON inventory_history(item_id, logged_at DESC);

-- ─── 17. keep_notes ──────────────────────────────────────────────────────────
CREATE TABLE keep_notes (
    id                  BIGSERIAL    PRIMARY KEY,
    note_content        TEXT         NOT NULL,
    created_by_admin_id BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by_admin_id BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── 18. revoked_tokens (Part 13 §3 — per-device logout denylist) ────────────
-- Each row represents one revoked JWT session.
-- Logging out on device A inserts that device's token hash here.
-- Device B holds a different token — NOT in this table — so B stays logged in.
-- Storage: SHA-256(raw_jwt) as 64-char hex; we never store the raw JWT.
-- Cleanup: entries with expires_at < NOW() are pruned hourly (safe: expired JWTs
-- are rejected by JWT validation before the denylist check is reached anyway).
CREATE TABLE revoked_tokens (
    id          BIGSERIAL    PRIMARY KEY,
    token_hash  CHAR(64)     NOT NULL UNIQUE,
                             -- SHA-256 hex digest of the raw JWT string
    admin_id    BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
                             -- which admin this token belonged to (audit info)
    revoked_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ  NOT NULL
                             -- copied from JWT "exp" claim; used for cleanup
);

CREATE INDEX idx_revoked_tokens_hash       ON revoked_tokens(token_hash);
CREATE INDEX idx_revoked_tokens_expires_at ON revoked_tokens(expires_at);
CREATE INDEX idx_revoked_tokens_admin      ON revoked_tokens(admin_id);

-- ─── 19. reviews (Part 13 §8) ────────────────────────────────────────────────
-- Customer product reviews submitted via a tokenized, expiring public link.
-- No customer account is required to submit a review.
-- One review per sale_line_item_id — same customer can review again if they buy
-- the same item in a separate order (different sale_line_item_id).
CREATE TABLE reviews (
    id               BIGSERIAL    PRIMARY KEY,
    item_id          BIGINT       NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    sale_line_item_id BIGINT      NOT NULL REFERENCES sale_line_items(id) ON DELETE CASCADE,
                                  -- UNIQUE enforces one-review-per-purchased-line-item
    customer_id      BIGINT       REFERENCES customers(id) ON DELETE SET NULL,
    star_rating      SMALLINT     NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
    comment          TEXT,        -- optional free-text comment
    submitted_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_review_per_line_item UNIQUE (sale_line_item_id)
);

CREATE INDEX idx_reviews_item        ON reviews(item_id);
CREATE INDEX idx_reviews_customer    ON reviews(customer_id);
CREATE INDEX idx_reviews_submitted   ON reviews(submitted_at);

-- ─── 20. review_tokens (Part 13 §8) ─────────────────────────────────────────
-- Short-lived, signed tokens emailed to customers after ORDER_DELIVERED_SUCCESSFULLY.
-- Each token identifies a specific sale_line_item — the review page validates
-- and consumes it before accepting the submission.
-- used_at IS NULL = not yet used; NOT NULL = already used (reject re-submission).
CREATE TABLE review_tokens (
    id               BIGSERIAL    PRIMARY KEY,
    token            VARCHAR(128) NOT NULL UNIQUE,
                                  -- cryptographically random, URL-safe token
    sale_line_item_id BIGINT      NOT NULL UNIQUE REFERENCES sale_line_items(id) ON DELETE CASCADE,
    customer_id      BIGINT       REFERENCES customers(id) ON DELETE SET NULL,
    expires_at       TIMESTAMPTZ  NOT NULL,
                                  -- tokens expire after 30 days
    used_at          TIMESTAMPTZ,
                                  -- NULL = not yet used; NOT NULL = consumed
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_tokens_token        ON review_tokens(token);
CREATE INDEX idx_review_tokens_line_item    ON review_tokens(sale_line_item_id);
CREATE INDEX idx_review_tokens_expires_at   ON review_tokens(expires_at);

-- =============================================================================
-- NOT CREATED (intentionally):
--   sales_search_index  → replaced by SQL indexes + WHERE / full-text search
--   sheet_config / app_meta → no Postgres equivalent; Flyway owns schema versioning
-- =============================================================================
