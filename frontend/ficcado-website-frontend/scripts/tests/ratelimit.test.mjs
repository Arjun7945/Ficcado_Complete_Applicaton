// =============================================================================
// Rate Limit Test Suite — scripts/tests/ratelimit.test.mjs
// Verifies Upstash-style sliding memory fallback, boundary enforcement, and reset
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit } from '../../src/lib/rateLimit.ts';

describe('Rate Limiter Behavior & Limits per D2', () => {
  test('permits requests within configured window and limit', async () => {
    const testIp = '192.168.1.101';
    const res1 = await checkRateLimit(testIp, 'test-orders', 3, 10);
    assert.equal(res1.success, true);
    assert.equal(res1.limit, 3);
    assert.equal(res1.remaining, 2);

    const res2 = await checkRateLimit(testIp, 'test-orders', 3, 10);
    assert.equal(res2.success, true);
    assert.equal(res2.remaining, 1);

    const res3 = await checkRateLimit(testIp, 'test-orders', 3, 10);
    assert.equal(res3.success, true);
    assert.equal(res3.remaining, 0);
  });

  test('rejects requests exceeding limit with success=false', async () => {
    const testIp = '192.168.1.102';
    // Consume limit of 2
    await checkRateLimit(testIp, 'test-burst', 2, 10);
    await checkRateLimit(testIp, 'test-burst', 2, 10);

    // Third request exceeds limit
    const exceeded = await checkRateLimit(testIp, 'test-burst', 2, 10);
    assert.equal(exceeded.success, false);
    assert.equal(exceeded.remaining, 0);
    assert.ok(exceeded.resetSeconds > 0 && exceeded.resetSeconds <= 10);
  });

  test('isolates different scopes and identifiers', async () => {
    const ipA = '10.0.0.1';
    const ipB = '10.0.0.2';

    // Exhaust ipA
    await checkRateLimit(ipA, 'test-iso', 1, 10);
    const blockedA = await checkRateLimit(ipA, 'test-iso', 1, 10);
    assert.equal(blockedA.success, false);

    // ipB should remain allowed
    const allowedB = await checkRateLimit(ipB, 'test-iso', 1, 10);
    assert.equal(allowedB.success, true);

    // ipA on different scope should remain allowed
    const allowedOtherScope = await checkRateLimit(ipA, 'test-other-scope', 1, 10);
    assert.equal(allowedOtherScope.success, true);
  });
});
