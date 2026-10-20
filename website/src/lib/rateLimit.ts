// =============================================================================
// Rate Limiter — /src/lib/rateLimit.ts
// Implements Upstash REST rate limiting with resilient in-memory fallback per D2.
// Zero heavy SDK dependencies. Never blocks orders if store is unreachable.
// =============================================================================

import type { NextRequest } from 'next/server';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

// In-memory sliding window fallback
interface MemoryBucket {
  count: number;
  resetAt: number;
}
const memoryBuckets = new Map<string, MemoryBucket>();

// Clean up expired buckets periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memoryBuckets.entries()) {
      if (bucket.resetAt <= now) {
        memoryBuckets.delete(key);
      }
    }
  }, 60000).unref?.();
}

/**
 * Extracts client IP safely from standard reverse-proxy headers.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const proxyIp = req.headers.get('x-vercel-forwarded-for') || req.headers.get('client-ip');
  if (proxyIp) return proxyIp.split(',')[0].trim();
  return '127.0.0.1';
}

/**
 * Memory-based rate limiter (fallback or explicit memory mode)
 */
function checkMemoryRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  let bucket = memoryBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 1, resetAt: now + windowSeconds * 1000 };
    memoryBuckets.set(key, bucket);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetSeconds: windowSeconds,
    };
  }

  bucket.count++;
  const remaining = Math.max(0, limit - bucket.count);
  const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

  return {
    success: bucket.count <= limit,
    limit,
    remaining,
    resetSeconds,
  };
}

/**
 * Checks rate limit for a given key and window.
 *
 * @param identifier Unique identifier (e.g. IP address or submission token)
 * @param prefix Scope prefix (e.g. 'orders', 'products', 'inquiry')
 * @param limit Maximum requests permitted in window
 * @param windowSeconds Duration of window in seconds
 */
export async function checkRateLimit(
  identifier: string,
  prefix: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const store = process.env.RATE_LIMIT_STORE || 'memory';
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const key = `rl:${prefix}:${identifier}`;

  if (store === 'upstash' && upstashUrl && upstashToken) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s fast timeout

      // Use Upstash REST pipeline for atomic INCR + EXPIRE
      const res = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, windowSeconds, 'NX'],
        ]),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const results = await res.json();
        const count = typeof results[0]?.result === 'number' ? results[0].result : 1;
        const remaining = Math.max(0, limit - count);

        return {
          success: count <= limit,
          limit,
          remaining,
          resetSeconds: windowSeconds,
        };
      } else {
        console.warn(`[RateLimit] Upstash pipeline returned ${res.status}. Falling back to memory.`);
      }
    } catch (err) {
      console.warn(`[RateLimit] Upstash REST unreachable (${(err as Error).message}). Falling back to memory.`);
    }
  } else if (store !== 'memory' && process.env.NODE_ENV === 'production') {
    console.warn('[RateLimit] RATE_LIMIT_STORE is configured as upstash but credentials are missing. Falling back to memory.');
  }

  // Fallback to local memory bucket
  return checkMemoryRateLimit(key, limit, windowSeconds);
}
