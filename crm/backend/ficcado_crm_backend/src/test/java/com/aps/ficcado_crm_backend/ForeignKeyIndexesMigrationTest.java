package com.aps.ficcado_crm_backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Verification test for AUD-12 Foreign Key Indexes Migration.
 *
 * Verifies that:
 * 1. The migration applies cleanly on an empty/new database with required tables.
 * 2. It is strictly idempotent and safe to run multiple times (CREATE INDEX IF NOT EXISTS).
 * 3. Indexes exist on sale_line_items.sale_id, sales.customer_id, and inventory_history.item_id.
 */
class ForeignKeyIndexesMigrationTest {

    @Test
    @DisplayName("AUD-12: Migration applies cleanly on populated tables and creates indexes")
    void migrationAppliesCleanlyOnTables() throws Exception {
        DataSource ds = new EmbeddedDatabaseBuilder()
                .setType(EmbeddedDatabaseType.H2)
                .setName("aud12_populated_test_db")
                .build();

        try (Connection conn = ds.getConnection();
             Statement stmt = conn.createStatement()) {

            // 1. Create base tables
            stmt.execute("CREATE TABLE sales (id BIGINT PRIMARY KEY, customer_id BIGINT NOT NULL)");
            stmt.execute("CREATE TABLE sale_line_items (id BIGINT PRIMARY KEY, sale_id BIGINT NOT NULL, item_id BIGINT NOT NULL)");
            stmt.execute("CREATE TABLE inventory_history (id BIGINT PRIMARY KEY, item_id BIGINT NOT NULL, logged_at TIMESTAMP)");

            // 2. Apply V4 migration script
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("db/migration/V4__foreign_key_indexes.sql"));

            // 3. Verify index existence via metadata
            Set<String> indexNames = new HashSet<>();
            try (ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "SALE_LINE_ITEMS", false, false)) {
                while (rs.next()) {
                    String idxName = rs.getString("INDEX_NAME");
                    if (idxName != null) {
                        indexNames.add(idxName.toLowerCase());
                    }
                }
            }
            try (ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "SALES", false, false)) {
                while (rs.next()) {
                    String idxName = rs.getString("INDEX_NAME");
                    if (idxName != null) {
                        indexNames.add(idxName.toLowerCase());
                    }
                }
            }
            try (ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "INVENTORY_HISTORY", false, false)) {
                while (rs.next()) {
                    String idxName = rs.getString("INDEX_NAME");
                    if (idxName != null) {
                        indexNames.add(idxName.toLowerCase());
                    }
                }
            }

            assertThat(indexNames).contains(
                    "idx_sale_line_items_sale_id",
                    "idx_sales_customer_id",
                    "idx_inventory_history_item_id"
            );
        }
    }

    @Test
    @DisplayName("AUD-12: Migration is idempotent and safe to execute twice")
    void migrationIsSafeToRunTwice() throws Exception {
        DataSource ds = new EmbeddedDatabaseBuilder()
                .setType(EmbeddedDatabaseType.H2)
                .setName("aud12_idempotency_test_db")
                .build();

        try (Connection conn = ds.getConnection();
             Statement stmt = conn.createStatement()) {

            stmt.execute("CREATE TABLE sales (id BIGINT PRIMARY KEY, customer_id BIGINT NOT NULL)");
            stmt.execute("CREATE TABLE sale_line_items (id BIGINT PRIMARY KEY, sale_id BIGINT NOT NULL)");
            stmt.execute("CREATE TABLE inventory_history (id BIGINT PRIMARY KEY, item_id BIGINT NOT NULL)");

            // First run
            assertThatCode(() ->
                    ScriptUtils.executeSqlScript(conn, new ClassPathResource("db/migration/V4__foreign_key_indexes.sql"))
            ).doesNotThrowAnyException();

            // Second run must NOT throw duplicate index error
            assertThatCode(() ->
                    ScriptUtils.executeSqlScript(conn, new ClassPathResource("db/migration/V4__foreign_key_indexes.sql"))
            ).doesNotThrowAnyException();
        }
    }
}
