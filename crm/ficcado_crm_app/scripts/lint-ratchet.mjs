import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate baseline file (inside .github/lint-baseline/crm.json at repository root)
const possiblePaths = [
  path.resolve(process.cwd(), '../../.github/lint-baseline/crm.json'),
  path.resolve(process.cwd(), '.github/lint-baseline/crm.json'),
  path.resolve(__dirname, '../../../.github/lint-baseline/crm.json'),
];

let baselinePath = possiblePaths.find(p => fs.existsSync(p));
if (!baselinePath) {
  console.error('❌ Could not locate .github/lint-baseline/crm.json at any of:', possiblePaths);
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const allowedErrors = baseline.baselineErrors;
const allowedWarnings = baseline.baselineWarnings || 50;

console.log('====================================================');
console.log('🔍 CRM ESLint Ratchet Evaluation (AUD-10)');
console.log(`Allowed Baseline Errors:   ${allowedErrors}`);
console.log(`Allowed Baseline Warnings: ${allowedWarnings}`);
console.log('====================================================');

let stdout = '';
try {
  stdout = execSync('npx eslint . --format json', {
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
} catch (error) {
  stdout = error.stdout ? error.stdout.toString() : '';
  if (!stdout) {
    console.error('Failed to run eslint:', error.message);
    if (error.stderr) console.error(error.stderr.toString());
    process.exit(1);
  }
}

let results = [];
try {
  results = JSON.parse(stdout);
} catch (parseErr) {
  console.error('Failed to parse ESLint JSON output:', parseErr.message);
  console.error(stdout.substring(0, 500));
  process.exit(1);
}

const totalErrors = results.reduce((acc, r) => acc + (r.errorCount || 0), 0);
const totalWarnings = results.reduce((acc, r) => acc + (r.warningCount || 0), 0);

console.log(`Measured Errors:   ${totalErrors}`);
console.log(`Measured Warnings: ${totalWarnings}`);
console.log('----------------------------------------------------');

if (totalErrors > allowedErrors) {
  const diff = totalErrors - allowedErrors;
  console.error(`❌ REGRESSION: Current errors (${totalErrors}) exceed baseline (${allowedErrors}) by +${diff}.`);
  console.error('You have introduced new ESLint errors. Please fix them before committing or deploying.');
  process.exit(1);
}

if (totalErrors < allowedErrors) {
  const improvement = allowedErrors - totalErrors;
  console.log(`🎉 NOTICE: Error count (${totalErrors}) improved by -${improvement} below baseline (${allowedErrors})!`);
  console.log('Remember to update .github/lint-baseline/crm.json to lock in this improvement.');
} else {
  console.log(`✓ PASS: Current errors (${totalErrors}) are within permitted baseline (${allowedErrors}).`);
}

console.log('====================================================');
process.exit(0);
