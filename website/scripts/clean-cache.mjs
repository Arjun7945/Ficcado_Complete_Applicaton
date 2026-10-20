// =============================================================================
// Ficcado Clothing — Cache & Build Cleaner
// Automatically cleans active Next.js disk caches (.next/cache, .next/dev)
// and updates the build timestamp to ensure fresh asset delivery across restarts.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CACHE_DIRS_TO_CLEAN = [
  path.join(rootDir, '.next', 'cache'),
  path.join(rootDir, '.next', 'dev'),
];

console.log('====================================================');
console.log('🧹 Ficcado Cache Invalidator & Cleaner');
console.log('====================================================');

let cleanedCount = 0;
for (const dir of CACHE_DIRS_TO_CLEAN) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✓ Purged cache directory: ${path.relative(rootDir, dir)}`);
      cleanedCount++;
    }
  } catch (err) {
    console.warn(`! Could not remove ${path.relative(rootDir, dir)}:`, err.message);
  }
}

// Generate fresh build marker with current timestamp
const generatedDir = path.join(rootDir, 'src', 'generated');
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
}

const buildMarker = {
  buildTime: Date.now(),
  timestamp: new Date().toISOString(),
};

fs.writeFileSync(
  path.join(generatedDir, 'build-info.json'),
  JSON.stringify(buildMarker, null, 2),
  'utf8'
);

console.log(`✓ Updated build marker: ${buildMarker.timestamp}`);
console.log(`✓ Cache cleanup complete (${cleanedCount} cache stores cleared)`);
console.log('====================================================');
