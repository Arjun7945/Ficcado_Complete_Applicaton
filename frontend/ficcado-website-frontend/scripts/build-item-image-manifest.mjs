#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

// -----------------------------------------------------------------------------
// Ficcado Item Image Manifest Builder (PART 2 - R2.4)
// Discovers image files at build time without inspecting image contents.
// -----------------------------------------------------------------------------

const ALLOWED_EXTENSIONS = new Set(['webp', 'jpg', 'jpeg', 'png', 'avif']);
const ITEMS_DIR = path.resolve(process.cwd(), 'public/images/items');
const OUTPUT_FILE = path.resolve(process.cwd(), 'src/generated/item-images.json');

// Preferred color ordering per item folder: defines which variant is displayed first in UI cards and defaults
const ITEM_COLOR_PRIORITY = {
  'chosen': ['red'],
  'grounded': ['black'],
  'remember': ['blue'],
  'reminder': ['green'],
  'frame-the-bloom': ['white', 'beige', 'air-blue'],
  'echoes-of-the-empire': ['black', 'maroon', 'white'],
  'silent-sentinel': ['black', 'white'],
  'the-watchers': ['black'],
};

function getColorPriority(folderName, fileName) {
  const priorities = ITEM_COLOR_PRIORITY[folderName];
  if (!priorities) return 999;
  for (let idx = 0; idx < priorities.length; idx++) {
    const color = priorities[idx];
    if (fileName.startsWith(`${color}-`)) {
      return idx;
    }
  }
  return 999;
}

console.log('====================================================');
console.log('🖼️  Ficcado Item Image Manifest Generator');
console.log('====================================================');

if (!fs.existsSync(ITEMS_DIR)) {
  console.error(`❌ Items directory not found at: ${ITEMS_DIR}`);
  process.exit(1);
}

const entries = fs.readdirSync(ITEMS_DIR, { withFileTypes: true });
const manifest = {};
const errors = [];
const warnings = [];

for (const entry of entries) {
  if (!entry.isDirectory()) {
    // Non-directory files like README.md are allowed in items directory
    continue;
  }

  const folderName = entry.name;

  // Validation: lowercase, no spaces, kebab-case
  if (folderName !== folderName.toLowerCase()) {
    errors.push(`Folder "${folderName}" contains uppercase characters. Folder names must be strictly lowercase.`);
  }
  if (/\s/.test(folderName)) {
    errors.push(`Folder "${folderName}" contains whitespace. Folder names must not contain spaces.`);
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(folderName)) {
    errors.push(`Folder "${folderName}" is not valid kebab-case.`);
  }

  const folderPath = path.join(ITEMS_DIR, folderName);
  const files = fs.readdirSync(folderPath, { withFileTypes: true });

  const itemImages = [];

  for (const file of files) {
    if (!file.isFile()) continue;

    const fileName = file.name;

    // Check for uppercase or spaces
    if (fileName !== fileName.toLowerCase()) {
      errors.push(`File "${folderName}/${fileName}" has uppercase characters. Names must be lowercase.`);
    }
    if (/\s/.test(fileName)) {
      errors.push(`File "${folderName}/${fileName}" has whitespace.`);
    }

    const extMatch = fileName.match(/\.([a-z0-9]+)$/i);
    if (!extMatch) {
      errors.push(`File "${folderName}/${fileName}" does not have an extension.`);
      continue;
    }

    const ext = extMatch[1].toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      errors.push(`File "${folderName}/${fileName}" has unsupported extension "${ext}". Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}.`);
      continue;
    }

    // Must be valid kebab-case with allowed extension
    if (!/^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+$/.test(fileName)) {
      errors.push(`File "${folderName}/${fileName}" is not valid kebab-case.`);
      continue;
    }

    itemImages.push(fileName);
  }

  // Sort by defined color priority first, then naturally by image index
  itemImages.sort((a, b) => {
    const prioA = getColorPriority(folderName, a);
    const prioB = getColorPriority(folderName, b);
    if (prioA !== prioB) {
      return prioA - prioB;
    }
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  if (itemImages.length === 0) {
    warnings.push(`Folder "${folderName}" is empty.`);
  }

  manifest[folderName] = itemImages;
}

// Ensure output directory exists
const outDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Write generated manifest
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

// Print Summary
const folderCount = Object.keys(manifest).length;
const totalImages = Object.values(manifest).reduce((acc, curr) => acc + curr.length, 0);

console.log(`✓ Processed ${folderCount} item folders with ${totalImages} total images.`);
for (const [folder, files] of Object.entries(manifest)) {
  console.log(`  - ${folder}: [${files.join(', ')}]`);
}

if (warnings.length > 0) {
  console.log('\n⚠️  Validation Warnings:');
  warnings.forEach((w) => console.log(`  - ${w}`));
}

if (errors.length > 0) {
  console.error('\n❌ Validation Errors (Failing Build):');
  errors.forEach((e) => console.error(`  - ${e}`));
  console.log('====================================================');
  process.exit(1);
}

console.log(`✓ Manifest written to: src/generated/item-images.json`);
console.log('====================================================');
process.exit(0);
