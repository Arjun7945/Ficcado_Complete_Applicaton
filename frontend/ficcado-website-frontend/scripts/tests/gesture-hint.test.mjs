// =============================================================================
// Gesture Hint Verification Test — Requirement 6 Updated
// Ensures ImageGestureHint exists, is mounted in ProductModal, runs for 2s,
// and does NOT persist in localStorage per client instructions.
// =============================================================================

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

describe('Gesture Hint on Item Image per Requirement 6', () => {
  test('ImageGestureHint component exists with 2s timeout and accessible markup', () => {
    const hintPath = path.join(PROJECT_ROOT, 'src/components/ui/ImageGestureHint.tsx');
    assert.ok(fs.existsSync(hintPath), 'ImageGestureHint.tsx must exist');

    const content = fs.readFileSync(hintPath, 'utf8');
    assert.strictEqual(
      content.includes('localStorage'),
      false,
      'Must NOT use localStorage persistence per client instructions'
    );
    assert.match(content, /2000/, 'Must use 2 second auto-dismiss duration');
    assert.match(content, /Tap Image for Close Look|Tap or click/, 'Must provide clear zoom indication');
    assert.match(content, /svg/, 'Must render SVG hand gesture illustration');
  });

  test('ProductModal mounts ImageGestureHint within image inspection container', () => {
    const modalPath = path.join(PROJECT_ROOT, 'src/components/modals/ProductModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf8');

    assert.match(content, /import.*ImageGestureHint.*from/, 'ProductModal must import ImageGestureHint');
    assert.match(content, /<ImageGestureHint/, 'ProductModal must render <ImageGestureHint />');
  });
});
