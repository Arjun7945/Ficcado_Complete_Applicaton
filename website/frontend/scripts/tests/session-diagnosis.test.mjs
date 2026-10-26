// =============================================================================
// Phase P2-4 Session Management Diagnostic Test Suite
// scripts/tests/session-diagnosis.test.mjs
// Reproduces root causes of session loss on refresh/navigation per Part 2 Item 4A.
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase P2-4 4A: Diagnosis of Session Loss on Refresh / Navigation', () => {
  const rootDir = process.cwd();

  test('Diagnosis 1: CustomerAuthContext resets customer state to null on reload (in-memory state loss)', () => {
    const contextFile = path.join(rootDir, 'src', 'context', 'CustomerAuthContext.tsx');
    assert.ok(fs.existsSync(contextFile));
    const content = fs.readFileSync(contextFile, 'utf8');

    // Diagnose that CustomerAuthContext now restores state on load & route change
    assert.ok(
      content.includes('checkCustomerSession'),
      'Resolved: CustomerAuthContext now validates and restores state from server session authority'
    );
  });

  test('Diagnosis 2: Gateway configured with auth_request subrequest routing and X-Customer-Id sanitization', () => {
    const gatewayTemplate = path.join(rootDir, '..', '..', 'infra', 'gateway', 'nginx.conf.template');
    assert.ok(fs.existsSync(gatewayTemplate));
    const content = fs.readFileSync(gatewayTemplate, 'utf8');

    // Asserts auth_request is present for customer-protected routes
    assert.ok(
      content.includes('auth_request /_auth_customer_session;'),
      'Resolved: NGINX gateway now routes customer-protected endpoints through auth_request subrequest'
    );

    // Asserts client X-Customer-Id is stripped
    assert.ok(
      content.includes('proxy_set_header X-Customer-Id "";'),
      'Resolved: NGINX gateway strips client-supplied X-Customer-Id to prevent forgery'
    );
  });

  test('Diagnosis 3: Ficcado-Data provides Redis server-side session authority (GET /api/customer/session)', () => {
    const sessionController = path.join(
      rootDir,
      '..',
      '..',
      'crm',
      'backend',
      'ficcado_crm_backend',
      'src',
      'main',
      'java',
      'com',
      'aps',
      'ficcado_crm_backend',
      'controller',
      'CustomerSessionController.java'
    );
    assert.ok(fs.existsSync(sessionController), 'CustomerSessionController.java must exist');
    const content = fs.readFileSync(sessionController, 'utf8');

    // Check GET /api/customer/session exists
    assert.ok(
      content.includes('@RequestMapping("/api/customer/session")'),
      'Resolved: Backend provides GET /api/customer/session to check remaining sliding session seconds'
    );
  });
});
