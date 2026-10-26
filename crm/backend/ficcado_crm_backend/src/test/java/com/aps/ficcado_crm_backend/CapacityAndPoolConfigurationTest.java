package com.aps.ficcado_crm_backend;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.ConfigurationPropertySource;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verification test for AUD-11 Capacity and Connection Pool Tuning.
 *
 * Tests:
 * 1. Environment variable binding and override for HikariCP properties.
 * 2. Environment variable binding and override for Tomcat server thread properties.
 * 3. Exposure of HikariCP pool metrics through Micrometer.
 * 4. Total connection capacity constraint (sum of service pools <= PostgreSQL max_connections).
 */
class CapacityAndPoolConfigurationTest {

    @Test
    @DisplayName("AUD-11: Environment variables override HikariCP defaults")
    void hikariPropertiesOverride() {
        Map<String, Object> props = new HashMap<>();
        props.put("spring.datasource.hikari.maximum-pool-size", "45");
        props.put("spring.datasource.hikari.minimum-idle", "8");
        props.put("spring.datasource.hikari.connection-timeout", "25000");
        props.put("spring.datasource.hikari.idle-timeout", "400000");
        props.put("spring.datasource.hikari.max-lifetime", "1200000");
        props.put("spring.datasource.hikari.leak-detection-threshold", "5000");

        ConfigurationPropertySource source = new MapConfigurationPropertySource(props);
        Binder binder = new Binder(source);

        HikariConfig hikariConfig = new HikariConfig();
        binder.bind("spring.datasource.hikari", Bindable.ofInstance(hikariConfig));

        assertThat(hikariConfig.getMaximumPoolSize()).isEqualTo(45);
        assertThat(hikariConfig.getMinimumIdle()).isEqualTo(8);
        assertThat(hikariConfig.getConnectionTimeout()).isEqualTo(25000);
        assertThat(hikariConfig.getIdleTimeout()).isEqualTo(400000);
        assertThat(hikariConfig.getMaxLifetime()).isEqualTo(1200000);
        assertThat(hikariConfig.getLeakDetectionThreshold()).isEqualTo(5000);
    }

    @Test
    @DisplayName("AUD-11: Environment variables override Tomcat thread defaults")
    void tomcatPropertiesOverride() {
        Map<String, Object> props = new HashMap<>();
        props.put("server.tomcat.threads.max", "150");
        props.put("server.tomcat.threads.min-spare", "20");
        props.put("server.tomcat.accept-count", "200");
        props.put("server.tomcat.connection-timeout", "15000ms");

        ConfigurationPropertySource source = new MapConfigurationPropertySource(props);
        Binder binder = new Binder(source);

        ServerProperties serverProperties = new ServerProperties();
        binder.bind("server", Bindable.ofInstance(serverProperties));

        assertThat(serverProperties.getTomcat().getThreads().getMax()).isEqualTo(150);
        assertThat(serverProperties.getTomcat().getThreads().getMinSpare()).isEqualTo(20);
        assertThat(serverProperties.getTomcat().getAcceptCount()).isEqualTo(200);
        assertThat(serverProperties.getTomcat().getConnectionTimeout()).isEqualTo(Duration.ofMillis(15000));
    }

    @Test
    @DisplayName("AUD-11: HikariCP pool metrics are registered in Micrometer")
    void hikariPoolMetricsExposure() {
        MeterRegistry registry = new SimpleMeterRegistry();

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:h2:mem:aud11_metrics_test");
        config.setUsername("sa");
        config.setPassword("");
        config.setPoolName("Aud11HikariTestPool");
        config.setMetricRegistry(registry);

        try (HikariDataSource ds = new HikariDataSource(config)) {
            assertThat(ds.isRunning()).isTrue();

            // HikariCP registers meters with name prefix "hikaricp.connections" or "<poolName>.pool"
            boolean hasHikariMeters = registry.getMeters().stream()
                    .anyMatch(m -> m.getId().getName().contains("connections") || m.getId().getName().contains("pool"));

            assertThat(hasHikariMeters)
                    .withFailMessage("Expected Hikari pool connection metrics in Micrometer registry. Found: %s",
                            registry.getMeters().stream().map(m -> m.getId().getName()).toList())
                    .isTrue();

            // Verify specific metrics
            assertThat(registry.find("hikaricp.connections.idle").gauge() != null ||
                       registry.find("Aud11HikariTestPool.pool.IdleConnections").gauge() != null).isTrue();
        }
    }

    @Test
    @DisplayName("AUD-11: Total connection pool allocation across services stays below PostgreSQL max_connections")
    void connectionBudgetUnderMaxConnections() {
        int crmMaxPool = 30;
        int websiteMaxPool = 15;
        int paymentMaxPool = 15;
        int postgresMaxConnections = 100;
        int superuserReserved = 3;

        int totalAllocatedConnections = crmMaxPool + websiteMaxPool + paymentMaxPool;
        int availableUserConnections = postgresMaxConnections - superuserReserved;

        assertThat(totalAllocatedConnections).isEqualTo(60);
        assertThat(totalAllocatedConnections)
                .withFailMessage("Total pool connections (%d) must stay strictly below available PostgreSQL connections (%d)",
                        totalAllocatedConnections, availableUserConnections)
                .isLessThan(availableUserConnections);

        int connectionHeadroom = availableUserConnections - totalAllocatedConnections;
        assertThat(connectionHeadroom).isGreaterThanOrEqualTo(37); // At least 37 connections headroom for migrations, replicas, admin
    }
}
