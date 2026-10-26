package com.aps.ficcado_crm_backend.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.cache.Cache;

import java.util.concurrent.Callable;

/**
 * Metric-instrumented Cache wrapper for Ficcado-Data (AUD-11).
 *
 * Increments Micrometer counters:
 * - ficcado.cache.hits{cache=<name>}
 * - ficcado.cache.misses{cache=<name>}
 */
public class InstrumentedCache implements Cache {

    private final Cache delegate;
    private final Counter hitCounter;
    private final Counter missCounter;

    public InstrumentedCache(Cache delegate, MeterRegistry registry) {
        this.delegate = delegate;
        this.hitCounter = Counter.builder("ficcado.cache.hits")
                .tag("cache", delegate.getName())
                .description("Number of cache hits")
                .register(registry);
        this.missCounter = Counter.builder("ficcado.cache.misses")
                .tag("cache", delegate.getName())
                .description("Number of cache misses")
                .register(registry);
    }

    @Override
    public String getName() {
        return delegate.getName();
    }

    @Override
    public Object getNativeCache() {
        return delegate.getNativeCache();
    }

    @Override
    public ValueWrapper get(Object key) {
        ValueWrapper wrapper = delegate.get(key);
        if (wrapper != null) {
            hitCounter.increment();
        } else {
            missCounter.increment();
        }
        return wrapper;
    }

    @Override
    public <T> T get(Object key, Class<T> type) {
        T value = delegate.get(key, type);
        if (value != null) {
            hitCounter.increment();
        } else {
            missCounter.increment();
        }
        return value;
    }

    @SuppressWarnings("unchecked")
    @Override
    public <T> T get(Object key, Callable<T> valueLoader) {
        ValueWrapper wrapper = delegate.get(key);
        if (wrapper != null) {
            hitCounter.increment();
            return (T) wrapper.get();
        }
        missCounter.increment();
        return delegate.get(key, valueLoader);
    }

    @Override
    public void put(Object key, Object value) {
        delegate.put(key, value);
    }

    @Override
    public ValueWrapper putIfAbsent(Object key, Object value) {
        return delegate.putIfAbsent(key, value);
    }

    @Override
    public void evict(Object key) {
        delegate.evict(key);
    }

    @Override
    public boolean evictIfPresent(Object key) {
        return delegate.evictIfPresent(key);
    }

    @Override
    public void clear() {
        delegate.clear();
    }

    @Override
    public boolean invalidate() {
        return delegate.invalidate();
    }
}
