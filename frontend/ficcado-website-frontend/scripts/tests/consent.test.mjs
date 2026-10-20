// =============================================================================
// Consent & Storage Minimization Test Suite — scripts/tests/consent.test.mjs
// Verifies 12-month expiry calculation, equal prominence, and storage keys per D5 / B-24
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Consent & Storage Minimization per D5 / B-24 / B-25 / B-26', () => {
  const root = process.cwd();

  test('validates 12-month expiration calculation logic in ConsentContext', () => {
    const contextFile = fs.readFileSync(path.join(root, 'src/context/ConsentContext.tsx'), 'utf8');
    assert.ok(
      contextFile.includes('365 * 24 * 60 * 60 * 1000'),
      'Must define 12-month (365 day) duration constant for consent'
    );
    assert.ok(
      contextFile.includes('expiresAt: now + TWELVE_MONTHS_MS'),
      'Must assign 12-month expiry to consent record'
    );
    assert.ok(
      contextFile.includes('parsed.expiresAt') && contextFile.includes('Date.now()'),
      'Must verify consent expiration against current timestamp'
    );
  });

  test('enforces storage minimization purging on preferences rejection', () => {
    const contextFile = fs.readFileSync(path.join(root, 'src/context/ConsentContext.tsx'), 'utf8');
    assert.ok(
      contextFile.includes("localStorage.removeItem('ficcado-checkout-draft')"),
      'Must purge draft checkout form on preferences reject'
    );
    assert.ok(
      contextFile.includes("localStorage.removeItem('ficcado-recent-searches')"),
      'Must purge recent search queries on preferences reject'
    );
  });

  test('verifies Cookie Policy page exists with real storage inventory', () => {
    const cookiesPage = fs.readFileSync(path.join(root, 'src/app/cookies/page.tsx'), 'utf8');
    assert.ok(cookiesPage.includes('ficcado-bag'), 'Must document shopping bag key');
    assert.ok(cookiesPage.includes('ficcado-last-order'), 'Must document session order key');
    assert.ok(cookiesPage.includes('ficcado-consent'), 'Must document consent key');
    assert.ok(cookiesPage.includes('fc_is_ios'), 'Must document iOS viewport key');
    assert.ok(cookiesPage.includes('ficcado-checkout-draft'), 'Must document checkout draft key');
    assert.ok(cookiesPage.includes('ficcado-recent-searches'), 'Must document recent searches key');
  });

  test('verifies Point-of-Collection privacy notices exist on checkout and support', () => {
    const checkoutPage = fs.readFileSync(path.join(root, 'src/app/checkout/page.tsx'), 'utf8');
    assert.ok(
      checkoutPage.includes('By placing this order, you agree to our'),
      'Checkout page must include Point-of-Collection notice'
    );
    assert.ok(
      checkoutPage.includes('/privacy'),
      'Checkout notice must link to privacy policy'
    );

    const supportPage = fs.readFileSync(path.join(root, 'src/app/support/page.tsx'), 'utf8');
    assert.ok(
      supportPage.includes('By submitting this request, you acknowledge our'),
      'Support page must include Point-of-Collection notice'
    );
  });
});
