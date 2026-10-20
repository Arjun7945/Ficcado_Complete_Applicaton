// =============================================================================
// Clipboard Resilience Test Suite — scripts/tests/clipboard.test.mjs
// Verifies clipboard fallback behavior and protection against NotAllowedError
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Clipboard Resilience per NotAllowedError Guard', () => {
  const rootDir = process.cwd();

  test('ensures src/lib/clipboard.ts exists and implements fallback', () => {
    const clipboardUtilPath = path.join(rootDir, 'src/lib/clipboard.ts');
    assert.ok(fs.existsSync(clipboardUtilPath), 'src/lib/clipboard.ts must exist');

    const content = fs.readFileSync(clipboardUtilPath, 'utf8');
    assert.ok(content.includes('copyToClipboard'), 'must export copyToClipboard');
    assert.ok(content.includes('navigator.clipboard'), 'must support navigator.clipboard');
    assert.ok(content.includes('execCommand'), 'must implement execCommand fallback');
  });

  test('ensures whatsapp-continue and journal pages use copyToClipboard', () => {
    const whatsappContinuePath = path.join(rootDir, 'src/app/checkout/whatsapp-continue/page.tsx');
    const journalPath = path.join(rootDir, 'src/app/journal/page.tsx');

    const whatsappContent = fs.readFileSync(whatsappContinuePath, 'utf8');
    assert.ok(
      whatsappContent.includes('copyToClipboard'),
      'whatsapp-continue page must use copyToClipboard'
    );
    assert.strictEqual(
      whatsappContent.includes('navigator.clipboard?.writeText'),
      false,
      'whatsapp-continue page must not directly call bare navigator.clipboard?.writeText'
    );

    const journalContent = fs.readFileSync(journalPath, 'utf8');
    assert.ok(
      journalContent.includes('copyToClipboard'),
      'journal page must use copyToClipboard'
    );
    assert.strictEqual(
      journalContent.includes('navigator.clipboard.writeText('),
      false,
      'journal page must not directly call bare navigator.clipboard.writeText'
    );
  });
});
