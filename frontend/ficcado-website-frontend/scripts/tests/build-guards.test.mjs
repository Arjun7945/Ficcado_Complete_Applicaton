// =============================================================================
// Build Guards Test Suite — scripts/tests/build-guards.test.mjs
// Verifies production guards in next.config.ts per Item 10 / D1 / D2 / D15
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Production Build Guards per Item 10, D1, D2, D15', () => {
  const rootDir = process.cwd();
  const nextConfigContent = fs.readFileSync(path.join(rootDir, 'next.config.ts'), 'utf8');

  test('enforces WhatsApp number guard in production', () => {
    assert.ok(
      nextConfigContent.includes('NEXT_PUBLIC_WHATSAPP_NUMBER is required'),
      'Must guard NEXT_PUBLIC_WHATSAPP_NUMBER'
    );
  });

  test('enforces Site URL guard in production', () => {
    assert.ok(
      nextConfigContent.includes('NEXT_PUBLIC_SITE_URL is required'),
      'Must guard NEXT_PUBLIC_SITE_URL'
    );
  });

  test('enforces Privacy Email guard in production per D15', () => {
    assert.ok(
      nextConfigContent.includes('NEXT_PUBLIC_PRIVACY_EMAIL is required'),
      'Must guard NEXT_PUBLIC_PRIVACY_EMAIL'
    );
  });

  test('enforces Order ID Gateway or explicit sheet-row mode per D1', () => {
    assert.ok(
      nextConfigContent.includes('ORDER_GATEWAY_URL and ORDER_GATEWAY_SECRET'),
      'Must check gateway credentials or explicit sheet-row mode'
    );
    assert.ok(
      nextConfigContent.includes("orderMode === 'sheet-row'") && nextConfigContent.includes('ORDER_ID_MODE'),
      'Must recognize explicit sheet-row fallback mode'
    );
  });

  test('enforces RATE_LIMIT_STORE in production per D2', () => {
    assert.ok(
      nextConfigContent.includes('RATE_LIMIT_STORE is required for production builds'),
      'Must guard RATE_LIMIT_STORE'
    );
  });
});
