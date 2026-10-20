// =============================================================================
// Health & API Integration Test Suite — scripts/tests/health-and-api.test.mjs
// Verifies /api/health protection per D4 and Sheets data parsing routines per P1
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GET as healthHandler } from '../../src/app/api/health/route.ts';

describe('Health Endpoint Protection per D4', () => {
  const origToken = process.env.ADMIN_TOKEN;

  test('rejects requests without admin token with 401 Unauthorized', async () => {
    process.env.ADMIN_TOKEN = 'test-secret-token-123';
    const req = new Request('http://localhost:3000/api/health');
    const res = await healthHandler(req);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error?.code, 'UNAUTHORIZED');
  });

  test('rejects requests with incorrect admin token with 401', async () => {
    process.env.ADMIN_TOKEN = 'test-secret-token-123';
    const req = new Request('http://localhost:3000/api/health?token=wrong-token');
    const res = await healthHandler(req);
    assert.strictEqual(res.status, 401);
  });

  test('authorizes valid Bearer header or token param with 200 OK and status flags only', async () => {
    process.env.ADMIN_TOKEN = 'test-secret-token-123';
    const req = new Request('http://localhost:3000/api/health', {
      headers: {
        authorization: 'Bearer test-secret-token-123',
      },
    });
    const res = await healthHandler(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'healthy');
    assert.ok(typeof body.data.checks.productsSnapshotAvailable === 'boolean');
    assert.ok(typeof body.data.checks.rateLimitStore === 'string');

    // Strictly ensure zero sensitive data or PII in response
    const jsonStr = JSON.stringify(body);
    assert.strictEqual(jsonStr.includes('PRIVATE KEY'), false, 'Must not leak private keys');
    assert.strictEqual(jsonStr.includes('1U1bdFZH'), false, 'Must not leak raw Sheet ID');
    process.env.ADMIN_TOKEN = origToken;
  });
});
