// =============================================================================
// Code Hygiene Test Suite — scripts/tests/code-hygiene.test.mjs
// Verifies CODE-01 (no duplicate faq.ts) and CODE-02 (no Math.random in src/)
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Code Hygiene per CODE-01 & CODE-02', () => {
  const rootDir = process.cwd();

  test('CODE-01: ensures no duplicate content/faq.ts outside src', () => {
    const dupFaq = path.join(rootDir, 'content/faq.ts');
    assert.strictEqual(
      fs.existsSync(dupFaq),
      false,
      'Duplicate content/faq.ts must not exist outside src/'
    );

    const canonicalFaq = path.join(rootDir, 'src/content/faq.ts');
    assert.ok(
      fs.existsSync(canonicalFaq),
      'Canonical src/content/faq.ts must exist'
    );
  });

  test('CODE-02: ensures zero Math.random() usage across src/', () => {
    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert.strictEqual(
            content.includes('Math.random()'),
            false,
            `File ${path.relative(rootDir, fullPath)} contains forbidden Math.random()`
          );
        }
      }
    }

    scanDir(path.join(rootDir, 'src'));
  });
});
