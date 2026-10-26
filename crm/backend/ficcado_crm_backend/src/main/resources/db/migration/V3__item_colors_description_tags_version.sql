-- =============================================================================
-- V3__item_colors_description_tags_version.sql
-- Part 2, Phase P2-2: Item colors, plain-text description, tags, and optimistic locking
-- =============================================================================

-- 1. Add description to items (plain text, max 2000 chars enforced in application layer)
ALTER TABLE items ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Add version to items for optimistic locking (AUD-09)
ALTER TABLE items ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- 3. Create item_colors table
CREATE TABLE IF NOT EXISTS item_colors (
    id                  BIGSERIAL   PRIMARY KEY,
    item_id             BIGINT      NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    color_hex           VARCHAR(7)  NOT NULL,
    display_order       INT         NOT NULL DEFAULT 0,
    CONSTRAINT uq_item_colors_item_color UNIQUE (item_id, color_hex)
);

CREATE INDEX IF NOT EXISTS idx_item_colors_item_id ON item_colors(item_id);

-- 4. Create item_tags table
CREATE TABLE IF NOT EXISTS item_tags (
    id                  BIGSERIAL   PRIMARY KEY,
    item_id             BIGINT      NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag                 VARCHAR(30) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_item_tags_item_lower_tag ON item_tags(item_id, LOWER(tag));
CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags(item_id);
