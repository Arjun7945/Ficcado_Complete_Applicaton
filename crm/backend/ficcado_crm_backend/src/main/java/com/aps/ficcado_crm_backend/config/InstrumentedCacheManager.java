package com.aps.ficcado_crm_backend.config;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;

import java.util.Collection;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * CacheManager wrapper that decorates all caches with {@link InstrumentedCache} for Micrometer tracking.
 */
public class InstrumentedCacheManager implements CacheManager {

    private final CacheManager delegate;
    private final MeterRegistry registry;
    private final ConcurrentMap<String, Cache> caches = new ConcurrentHashMap<>();

    public InstrumentedCacheManager(CacheManager delegate, MeterRegistry registry) {
        this.delegate = delegate;
        this.registry = registry;
    }

    @Override
    public Cache getCache(String name) {
        Cache cache = delegate.getCache(name);
        if (cache == null) {
            return null;
        }
        return caches.computeIfAbsent(name, n -> new InstrumentedCache(cache, registry));
    }

    @Override
    public Collection<String> getCacheNames() {
        return delegate.getCacheNames();
    }
}
