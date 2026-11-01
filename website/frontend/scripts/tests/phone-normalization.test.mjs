// =============================================================================
// Phone Normalization and Validation Test Suite — ISS-05 / Phase P3-3
// scripts/tests/phone-normalization.test.mjs
// Validates Indian phone normalization rules and live registration behavior.
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, isValidIndianPhone } from '../../src/lib/phone.ts';

describe('Phase P3-3 (ISS-05): Phone Normalization & Validation', () => {
  const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';

  describe('Pure Function Unit Tests', () => {
    test('Normalizes various valid Indian phone formats to 10-digit national number', () => {
      assert.strictEqual(normalizePhone('+91 98765 43210'), '9876543210');
      assert.strictEqual(normalizePhone('98765-43210'), '9876543210');
      assert.strictEqual(normalizePhone('09876543210'), '9876543210');
      assert.strictEqual(normalizePhone('(98765) 43210'), '9876543210');
      assert.strictEqual(normalizePhone('9876543210'), '9876543210');
      assert.strictEqual(normalizePhone('+919876543210'), '9876543210');
      assert.strictEqual(normalizePhone('919876543210'), '9876543210');
    });

    test('Identifies valid 10-digit Indian mobile numbers (starting with 6-9)', () => {
      assert.strictEqual(isValidIndianPhone('+91 98765 43210'), true);
      assert.strictEqual(isValidIndianPhone('98765-43210'), true);
      assert.strictEqual(isValidIndianPhone('09876543210'), true);
      assert.strictEqual(isValidIndianPhone('(98765) 43210'), true);
      assert.strictEqual(isValidIndianPhone('9876543210'), true);
      assert.strictEqual(isValidIndianPhone('+918765432109'), true);
      assert.strictEqual(isValidIndianPhone('+917654321098'), true);
      assert.strictEqual(isValidIndianPhone('+916543210987'), true);
    });

    test('Rejects invalid phone numbers', () => {
      assert.strictEqual(isValidIndianPhone('12345'), false, 'Too short');
      assert.strictEqual(isValidIndianPhone('5987654321'), false, 'Does not start with 6-9');
      assert.strictEqual(isValidIndianPhone('+91 98765 4321'), false, 'Only 9 digits after prefix');
      assert.strictEqual(isValidIndianPhone('98765abcde'), false, 'Contains alphabet characters');
      assert.strictEqual(isValidIndianPhone(''), false, 'Empty string');
      assert.strictEqual(isValidIndianPhone(null), false, 'Null input');
      assert.strictEqual(isValidIndianPhone(undefined), false, 'Undefined input');
    });
  });

  describe('Live Registration End-to-End Tests via Gateway', () => {
    test('Gateway accepts registration with formatted phone "+91 98765 43210" and normalizes to 10 digits', async () => {
      const uniqueSuffix = Date.now().toString().slice(-5);
      const email = `test.phone.${Date.now()}@ficcado.test`;
      const phone = `+91 98765 ${uniqueSuffix}`; // 5 + 5 = 10 digits

      const res = await fetch(`${GATEWAY_URL}/api/customer/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Phone Test User',
          email: email,
          phone: phone,
          password: 'Password123!',
        }),
      });

      assert.strictEqual(res.status, 201, `Expected 201 Created but received ${res.status}`);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.customer, 'Response must include customer object');
      assert.strictEqual(
        body.customer.phone,
        `98765${uniqueSuffix}`,
        `Customer phone in database must be normalized 10-digit without +91 or spaces`
      );
    });

    test('Gateway rejects registration with invalid phone format (e.g. "12345") with 400 Bad Request', async () => {
      const uniqueSuffix = Date.now().toString().slice(-6);
      const email = `invalid.phone.${uniqueSuffix}@ficcado.test`;

      const res = await fetch(`${GATEWAY_URL}/api/customer/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Invalid Phone User',
          email: email,
          phone: '12345',
          password: 'Password123!',
        }),
      });

      assert.strictEqual(res.status, 400, `Expected 400 Bad Request but received ${res.status}`);
    });
  });
});
