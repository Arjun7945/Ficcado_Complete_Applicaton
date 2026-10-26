package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.config.InstrumentedCache;
import com.aps.ficcado_crm_backend.config.InstrumentedCacheManager;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;

import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verification test for AUD-11 Catalog Caching, Hit/Miss Metrics, and Eviction.
 *
 * Verifies that:
 * 1. Cache misses increment the `ficcado.cache.misses` counter.
 * 2. Cache hits increment the `ficcado.cache.hits` counter.
 * 3. Eviction clears cached entries, causing subsequent lookups to miss and reload.
 */
class CatalogCacheMetricsAndEvictionTest {

    private MeterRegistry meterRegistry;
    private InstrumentedCacheManager cacheManager;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        ConcurrentMapCacheManager baseManager = new ConcurrentMapCacheManager("public-products", "public-product-id");
        cacheManager = new InstrumentedCacheManager(baseManager, meterRegistry);
    }

    @Test
    @DisplayName("AUD-11: First read misses, second read hits, eviction forces subsequent miss")
    void cacheHitMissAndEvictionFlow() {
        Cache cache = cacheManager.getCache("public-products");
        assertThat(cache).isNotNull();

        Counter hitCounter = meterRegistry.find("ficcado.cache.hits").tag("cache", "public-products").counter();
        Counter missCounter = meterRegistry.find("ficcado.cache.misses").tag("cache", "public-products").counter();

        assertThat(hitCounter).isNotNull();
        assertThat(missCounter).isNotNull();
        assertThat(hitCounter.count()).isEqualTo(0.0);
        assertThat(missCounter.count()).isEqualTo(0.0);

        AtomicInteger dbQueries = new AtomicInteger(0);

        // 1. First read — Cache Miss
        String key = "T-Shirts-false-none";
        String value = cache.get(key, () -> {
            dbQueries.incrementAndGet();
            return "CatalogData-V1";
        });

        assertThat(value).isEqualTo("CatalogData-V1");
        assertThat(dbQueries.get()).isEqualTo(1);
        assertThat(missCounter.count()).isEqualTo(1.0);
        assertThat(hitCounter.count()).isEqualTo(0.0);

        // 2. Second read — Cache Hit
        String cachedValue = cache.get(key, () -> {
            dbQueries.incrementAndGet();
            return "CatalogData-V1-Reloaded";
        });

        assertThat(cachedValue).isEqualTo("CatalogData-V1");
        assertThat(dbQueries.get()).isEqualTo(1); // ValueLoader NOT called
        assertThat(missCounter.count()).isEqualTo(1.0);
        assertThat(hitCounter.count()).isEqualTo(1.0);

        // 3. Third read via get(key)
        Cache.ValueWrapper wrapper = cache.get(key);
        assertThat(wrapper).isNotNull();
        assertThat(wrapper.get()).isEqualTo("CatalogData-V1");
        assertThat(hitCounter.count()).isEqualTo(2.0);

        // 4. Eviction (triggered by item changes / @CacheEvict)
        cache.evict(key);

        // 5. Subsequent read after eviction — Cache Miss again
        String reloadedValue = cache.get(key, () -> {
            dbQueries.incrementAndGet();
            return "CatalogData-V2";
        });

        assertThat(reloadedValue).isEqualTo("CatalogData-V2");
        assertThat(dbQueries.get()).isEqualTo(2); // ValueLoader called again
        assertThat(missCounter.count()).isEqualTo(2.0);
        assertThat(hitCounter.count()).isEqualTo(2.0);
    }

    @Test
    @DisplayName("AUD-11: Multiple cache regions track metrics independently with tag 'cache'")
    void multipleCachesTrackSeparately() {
        Cache productsCache = cacheManager.getCache("public-products");
        Cache idCache = cacheManager.getCache("public-product-id");

        assertThat(productsCache).isNotNull();
        assertThat(idCache).isNotNull();

        // Product cache read
        productsCache.get("all-false-none");
        // ID cache read
        idCache.get(101L);

        Counter prodMiss = meterRegistry.find("ficcado.cache.misses").tag("cache", "public-products").counter();
        Counter idMiss = meterRegistry.find("ficcado.cache.misses").tag("cache", "public-product-id").counter();

        assertThat(prodMiss).isNotNull();
        assertThat(idMiss).isNotNull();
        assertThat(prodMiss.count()).isEqualTo(1.0);
        assertThat(idMiss.count()).isEqualTo(1.0);
    }
}
