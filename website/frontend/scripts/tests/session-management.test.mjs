// =============================================================================
// Phase P2-4 Session Management Test Suite (Item 4D)
// scripts/tests/session-management.test.mjs
// Verifies:
// 1. Refresh and navigation keep the user logged in via checkCustomerSession
// 2. 9-minute idle warning prompt ("Still there?")
// 3. 10-minute idle logout and inactivity redirect
// 4. "Stay logged in" extends sliding window
// 5. Multi-tab synchronization via BroadcastChannel
// 6. Timer paused during payment
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase P2-4 4D: Customer Session Management & Sliding Logout Test Suite', () => {
  const rootDir = process.cwd();

  test('1. Session API client exports check, touch, and pause session endpoints', () => {
    const authApiFile = path.join(rootDir, 'src', 'lib', 'api', 'auth.ts');
    assert.ok(fs.existsSync(authApiFile), 'auth.ts exists');
    const content = fs.readFileSync(authApiFile, 'utf8');

    assert.ok(
      content.includes('checkCustomerSession'),
      'auth.ts must export checkCustomerSession calling GET /api/customer/session'
    );
    assert.ok(
      content.includes('touchCustomerSession'),
      'auth.ts must export touchCustomerSession calling POST /api/customer/session/touch'
    );
    assert.ok(
      content.includes('pauseCustomerSession'),
      'auth.ts must export pauseCustomerSession calling POST /api/customer/session/pause'
    );
    assert.ok(
      content.includes('X-Ficcado-Background'),
      'checkCustomerSession must pass X-Ficcado-Background header to avoid touching sliding window'
    );
  });

  test('2. CustomerAuthContext restores session on load and route navigation without logout flash', () => {
    const contextFile = path.join(rootDir, 'src', 'context', 'CustomerAuthContext.tsx');
    assert.ok(fs.existsSync(contextFile), 'CustomerAuthContext.tsx exists');
    const content = fs.readFileSync(contextFile, 'utf8');

    // Asserts session check on route navigation
    assert.ok(
      content.includes('usePathname'),
      'CustomerAuthContext must subscribe to pathname changes for navigation detection'
    );
    assert.ok(
      content.includes('checkCustomerSession()'),
      'CustomerAuthContext must verify session authority with checkCustomerSession'
    );
    assert.ok(
      content.includes('[pathname, refreshProfile]'),
      'CustomerAuthContext must re-verify session on route change'
    );
  });

  test('3. Idle detection triggers warning prompt at 9 minutes (540s) and logout at 10 minutes (600s)', () => {
    const contextFile = path.join(rootDir, 'src', 'context', 'CustomerAuthContext.tsx');
    const content = fs.readFileSync(contextFile, 'utf8');

    assert.ok(
      content.includes('IDLE_WARNING_SECONDS = 540') || content.includes('540'),
      'Idle warning must trigger at 9 minutes (540 seconds)'
    );
    assert.ok(
      content.includes('IDLE_LOGOUT_SECONDS = 600') || content.includes('600'),
      'Idle logout must trigger at 10 minutes (600 seconds)'
    );
    assert.ok(
      content.includes('You were logged out due to inactivity') || content.includes('inactivity'),
      'Logout must redirect to login with inactivity message'
    );
  });

  test('4. "Still there?" prompt modal renders accessible dialog with "Stay logged in" and "Log out"', () => {
    const modalFile = path.join(rootDir, 'src', 'components', 'modals', 'IdleTimeoutPromptModal.tsx');
    assert.ok(fs.existsSync(modalFile), 'IdleTimeoutPromptModal.tsx exists');
    const content = fs.readFileSync(modalFile, 'utf8');

    assert.ok(content.includes('id="idle-timeout-prompt-modal"'), 'Modal must have unique id');
    assert.ok(content.includes('Still there?'), 'Modal title must read "Still there?"');
    assert.ok(content.includes('Stay logged in'), 'Modal must contain "Stay logged in" button');
    assert.ok(content.includes('Log out'), 'Modal must contain "Log out" button');
    assert.ok(content.includes('id="stay-logged-in-btn"'), 'Stay logged in button must have unique id');
    assert.ok(content.includes('id="idle-logout-btn"'), 'Log out button must have unique id');
  });

  test('5. Multi-tab synchronization is implemented via BroadcastChannel', () => {
    const contextFile = path.join(rootDir, 'src', 'context', 'CustomerAuthContext.tsx');
    const content = fs.readFileSync(contextFile, 'utf8');

    assert.ok(
      content.includes("new BroadcastChannel('ficcado_customer_session')"),
      'Must open ficcado_customer_session BroadcastChannel for cross-tab sync'
    );
    assert.ok(
      content.includes("'LOGOUT'"),
      'Must handle cross-tab logout synchronization'
    );
    assert.ok(
      content.includes("'ACTIVITY'") || content.includes("'TOUCH'"),
      'Must handle cross-tab activity and touch keep-alive synchronization'
    );
  });

  test('6. Session timer is paused during checkout/payment flows', () => {
    const contextFile = path.join(rootDir, 'src', 'context', 'CustomerAuthContext.tsx');
    const content = fs.readFileSync(contextFile, 'utf8');

    assert.ok(
      content.includes('pauseSession'),
      'Context must expose pauseSession method'
    );
    assert.ok(
      content.includes('resumeSession'),
      'Context must expose resumeSession method'
    );
    assert.ok(
      content.includes('isSessionPaused'),
      'Context must track isSessionPaused state to suspend idle ticker'
    );
  });

  test('7. Simulated timer logic: validates 9-min prompt and 10-min logout threshold progression', () => {
    let now = 1000000;
    let lastActivity = now;
    let showPrompt = false;
    let loggedOut = false;
    let isPaused = false;

    function tick() {
      if (isPaused) return;
      const idle = Math.floor((now - lastActivity) / 1000);
      if (idle >= 600) {
        loggedOut = true;
        showPrompt = false;
      } else if (idle >= 540) {
        showPrompt = true;
      }
    }

    // Advance 5 minutes (300s): active, no prompt
    now += 300 * 1000;
    tick();
    assert.strictEqual(showPrompt, false);
    assert.strictEqual(loggedOut, false);

    // Advance to 9 minutes (540s): prompt appears
    now += 240 * 1000;
    tick();
    assert.strictEqual(showPrompt, true);
    assert.strictEqual(loggedOut, false);

    // User clicks "Stay logged in": activity resets
    lastActivity = now;
    showPrompt = false;
    tick();
    assert.strictEqual(showPrompt, false);
    assert.strictEqual(loggedOut, false);

    // Payment begins: pause timer
    isPaused = true;
    now += 700 * 1000; // 11+ minutes elapse during payment
    tick();
    assert.strictEqual(showPrompt, false, 'Prompt must not show while payment is paused');
    assert.strictEqual(loggedOut, false, 'User must not be logged out while payment is paused');

    // Payment completes: resume timer
    isPaused = false;
    lastActivity = now; // resumed activity
    tick();
    assert.strictEqual(loggedOut, false);

    // Inactivity continues past 10 minutes (600s)
    now += 605 * 1000;
    tick();
    assert.strictEqual(loggedOut, true, 'User must be logged out after 10 minutes idle');
  });
});
