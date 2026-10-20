'use client';

// =============================================================================
// Cache Invalidator Component — /src/components/providers/CacheInvalidator.tsx
// Detects server restart / build updates and invalidates active browser caches
// (CacheStorage API, ServiceWorkers, and stale temporary session state).
// =============================================================================

import { useEffect } from 'react';
import buildInfo from '@/generated/build-info.json';

const BUILD_STORAGE_KEY = 'ficcado-active-build-time';

export function CacheInvalidator() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const currentBuild = String(buildInfo.buildTime || '');
      const lastBuild = localStorage.getItem(BUILD_STORAGE_KEY);

      if (lastBuild && lastBuild !== currentBuild) {
        // 1. Purge Browser Cache Storage API (Service Workers / HTTP caches)
        if ('caches' in window) {
          caches.keys().then((keys) => {
            keys.forEach((key) => caches.delete(key));
          });
        }

        // 2. Unregister any lingering Service Workers
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
              registration.unregister();
            }
          });
        }

        console.info(
          `[Ficcado] Server update/restart detected (Build: ${buildInfo.timestamp}). Active caches purged.`
        );
      }

      localStorage.setItem(BUILD_STORAGE_KEY, currentBuild);
    } catch {
      // Safe fallback
    }
  }, []);

  return null;
}
