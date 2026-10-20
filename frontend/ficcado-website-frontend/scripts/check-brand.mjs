#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const FORBIDDEN = [
  /\bfikado\b/i,
  /\bfkd\b/i,
  /\bfik\b/i,
  /\bficado\b/i,
  /\bficcdo\b/i,
  /\bficcodo\b/i,
  /fikado-bag/i,
  /\bficcado\s+clothings\b/i,
];

const SCAN_DIRS = ['src', 'public', '../docs'];
const ALLOWED_FILES = new Set([
  // Historical briefs and requirement specifications that cite prior mistakes as problem statements
  '../docs/briefs/AGENT_BRIEF.md',
  '../docs/briefs/AGENT_BRIEF_2_WHATSAPP_ORDERING_REFACTOR.md',
  '../docs/briefs/REFACTOR_ON_PREVIOUS_UPDATE.md',
  '../docs/REQUIREMENT_AND_REFACTOR_PART_2.md',
  '../docs/memory.md',
  '../docs/prd.md',
]);

let violations = [];

function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
      if (ALLOWED_FILES.has(relPath)) continue;

      // Skip binary files
      if (/\.(webp|png|jpg|jpeg|ico|woff|woff2|ttf|eot)$/i.test(entry.name)) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split(/\r?\n/);
      lines.forEach((line, idx) => {
        for (const pattern of FORBIDDEN) {
          if (pattern.test(line)) {
            violations.push({
              file: relPath,
              line: idx + 1,
              content: line.trim(),
              pattern: pattern.toString(),
            });
          }
        }
      });
    }
  }
}

for (const dir of SCAN_DIRS) {
  scanDirectory(path.resolve(process.cwd(), dir));
}

console.log('====================================================');
console.log('🔍 Brand Spelling Audit (Ficcado Enforcement)');
console.log('====================================================');

if (violations.length > 0) {
  console.error(`❌ Found ${violations.length} forbidden brand spelling violations:`);
  violations.forEach(v => {
    console.error(`  - ${v.file}:${v.line} [matched ${v.pattern}]`);
    console.error(`    "${v.content}"`);
  });
  console.log('====================================================');
  process.exit(1);
} else {
  console.log('✓ Zero forbidden brand spellings found in src/ and public/.');
  console.log('✓ Brand spelling is strictly "Ficcado" and prefix is "FIC-".');
  console.log('====================================================');
  process.exit(0);
}
