// =============================================================================
// AuthModal & Authentication Policy Test Suite — P4W-3
// Verifies:
// 1. Password-only auth; no OTP in sign-in or registration
// 2. No prefilled credentials: empty state, placeholders, autoComplete attributes
// 3. Segmented control luxury tokens: active tab --primary with --text-inverse
// 4. Close button: --bg-surface-alt, --border-light, --text-secondary
// 5. Generic refusal message for duplicate email or phone
// 6. 3-step forgot password flow structure & password matching
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const authModalPath = path.resolve('src/components/modals/AuthModal.tsx');
const authModalContent = fs.readFileSync(authModalPath, 'utf8');

const authApiPath = path.resolve('src/lib/api/auth.ts');
const authApiContent = fs.readFileSync(authApiPath, 'utf8');

describe('P4W-3: Rebuilt Sign-In Modal, Password-Only Auth & Forgot Password', () => {

  test('1. AuthModal removes OTP from sign-in and registration', () => {
    // Must NOT have segmented toggle for Email OTP vs Password
    assert.doesNotMatch(authModalContent, /Email OTP/, 'Must not offer Email OTP in sign in');
    assert.doesNotMatch(authModalContent, /loginMethod/, 'Must not have loginMethod toggle');

    // Sign in view must be password-only
    assert.match(authModalContent, /handlePasswordLogin/, 'Must have password login handler');
    assert.match(authModalContent, /Sign In with Password/, 'Must have sign in with password button');
  });

  test('2. No prefilled credentials, required placeholders and autoComplete attributes', () => {
    // Initial state must be empty strings
    assert.match(authModalContent, /const \[email, setEmail\] = useState\(''\);/, 'Email initialized to empty string');
    assert.match(authModalContent, /const \[password, setPassword\] = useState\(''\);/, 'Password initialized to empty string');
    assert.match(authModalContent, /const \[regEmail, setRegEmail\] = useState\(''\);/, 'Reg email initialized to empty string');
    assert.match(authModalContent, /const \[regPassword, setRegPassword\] = useState\(''\);/, 'Reg password initialized to empty string');

    // Placeholders
    assert.match(authModalContent, /placeholder="you@example\.com"/, 'Must have placeholder you@example.com');
    assert.match(authModalContent, /placeholder="Enter your password"/, 'Must have placeholder Enter your password');
    assert.match(authModalContent, /placeholder="10-digit mobile number"/, 'Must have placeholder 10-digit mobile number');
    assert.match(authModalContent, /placeholder="Full name"/, 'Must have placeholder Full name');

    // autoComplete attributes to prevent browser autofill heuristics
    assert.match(authModalContent, /autoComplete="off"/, 'Email/text inputs must have autoComplete="off"');
    assert.match(authModalContent, /autoComplete="new-password"/, 'Password inputs must have autoComplete="new-password"');

    // Must never read from or write to storage
    assert.doesNotMatch(authModalContent, /localStorage\./, 'Must never access localStorage');
    assert.doesNotMatch(authModalContent, /sessionStorage\./, 'Must never access sessionStorage');
  });

  test('3. Segmented control luxury tokens: active tab --primary fill with --text-inverse', () => {
    // Active tab styling
    assert.match(authModalContent, /bg-\[var\(--primary\)\]\s+text-\[var\(--text-inverse\)\]/, 'Active tab must have --primary fill with --text-inverse text');

    // Container styling
    assert.match(authModalContent, /bg-\[var\(--bg-surface-alt\)\]\s+p-1\s+border\s+border-\[var\(--border-light\)\]/, 'Segmented control container must use --bg-surface-alt and --border-light');
  });

  test('4. Close button luxury tokens & accessibility', () => {
    assert.match(authModalContent, /id="auth-modal-close-btn"/, 'Must have close button with ID');
    assert.match(authModalContent, /bg-\[var\(--bg-surface-alt\)\]/, 'Close button must use --bg-surface-alt');
    assert.match(authModalContent, /border-\[var\(--border-light\)\]/, 'Close button must use --border-light');
    assert.match(authModalContent, /text-\[var\(--text-secondary\)\]/, 'Close button icon must use --text-secondary');
    assert.match(authModalContent, /focus-visible:ring-2/, 'Close button must have visible focus ring');
  });

  test('5. Generic refusal message on registration for existing account', () => {
    const genericRefusal = 'We could not create an account with these details. If you already have an account, sign in or use Forgot password.';
    assert.ok(authModalContent.includes(genericRefusal), 'Must show exact generic refusal message on registration failure');
  });

  test('6. 3-Step Forgot-Password Flow implemented in modal and API', () => {
    // Modal states
    assert.match(authModalContent, /activeView === 'forgot-password'/, 'Must support forgot-password view');
    assert.match(authModalContent, /forgotStep === 'request'/, 'Must support Step 1: Request code');
    assert.match(authModalContent, /forgotStep === 'verify'/, 'Must support Step 2: Verify code');
    assert.match(authModalContent, /forgotStep === 'new-password'/, 'Must support Step 3: New password');

    // Password matching in Step 3
    assert.match(authModalContent, /Passwords do not match/, 'Must validate passwords match');

    // API client functions
    assert.match(authApiContent, /export async function requestPasswordReset/, 'API must export requestPasswordReset');
    assert.match(authApiContent, /export async function verifyPasswordResetOtp/, 'API must export verifyPasswordResetOtp');
    assert.match(authApiContent, /export async function confirmPasswordReset/, 'API must export confirmPasswordReset');

    // Old login OTP functions removed from auth API
    assert.doesNotMatch(authApiContent, /export async function requestLoginOtp/, 'requestLoginOtp must be removed');
    assert.doesNotMatch(authApiContent, /export async function verifyLoginOtp/, 'verifyLoginOtp must be removed');
  });
});
