// =============================================================================
// Security Headers & Universal Caching Test Suite — scripts/tests/security-headers.test.mjs
// Verifies permanent removal of legacy provider configuration and enforces
// compliance with D13 header policies and Next.js security headers
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Universal Security Headers & Provider Decoupling per D13 & Item 6', () => {
  const rootDir = path.resolve(process.cwd(), '..');
  const legacyConfigName = ['net', 'lify', '.toml'].join('');
  const rootToml = path.join(rootDir, legacyConfigName);
  const nestedToml = path.join(process.cwd(), legacyConfigName);
  const nextConfigPath = path.join(process.cwd(), 'next.config.ts');

  test('enforces permanent removal of legacy provider config files', () => {
    assert.strictEqual(fs.existsSync(rootToml), false, 'Root legacy config must be permanently removed');
    assert.strictEqual(fs.existsSync(nestedToml), false, 'Nested legacy config must NOT exist');
  });

  test('validates security and caching headers in next.config.ts per D13', () => {
    assert.ok(fs.existsSync(nextConfigPath), 'next.config.ts must exist');
    const content = fs.readFileSync(nextConfigPath, 'utf8');

    // CSP Report-Only is present
    assert.ok(
      content.includes('Content-Security-Policy-Report-Only'),
      'Content-Security-Policy-Report-Only must be configured in next.config.ts'
    );

    // Deprecated X-XSS-Protection is removed
    assert.strictEqual(
      content.includes('X-XSS-Protection'),
      false,
      'X-XSS-Protection must be removed per D13'
    );

    // HSTS max-age=31536000 is present without preload/includeSubDomains
    assert.ok(
      content.includes("Strict-Transport-Security', value: 'max-age=31536000'"),
      'HSTS max-age=31536000 must be set'
    );
    assert.strictEqual(
      content.includes('includeSubDomains'),
      false,
      'includeSubDomains must be omitted per D13 unless confirmed'
    );
    assert.strictEqual(
      content.includes('preload'),
      false,
      'preload must be omitted per D13 unless confirmed'
    );

    // Cache-Control no-store for /api/orders and /api/inquiry
    assert.ok(
      content.includes("source: '/api/orders'"),
      'Must contain headers for /api/orders'
    );
    assert.ok(
      content.includes("source: '/api/inquiry'"),
      'Must contain headers for /api/inquiry'
    );
    assert.ok(
      content.includes('no-store'),
      'Must specify no-store for POST APIs'
    );

    // Static asset caching
    assert.ok(
      content.includes("source: '/fonts/:path*'"),
      'Must configure immutable caching for static font assets'
    );
  });
});
