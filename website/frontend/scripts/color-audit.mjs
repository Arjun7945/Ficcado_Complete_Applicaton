// =============================================================================
// Ficcado Clothing — Website Token & Non-Token Color Audit Script
// Scans src/ for raw hex literals, rgb/hsl, inline color styles, and Tailwind
// palette classes (amber, purple, emerald, stone, neutral, red, gray, etc.)
// Outputs docs/PART4_COLOR_AUDIT.md
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '../..');
const srcDir = path.join(frontendRoot, 'src');
const outputFile = path.join(repoRoot, 'docs/PART4_COLOR_AUDIT.md');

// Allowed files (token definitions and generated asset manifests)
const ALLOW_LIST = [
  path.join(srcDir, 'app', 'globals.css'),
  path.join(srcDir, 'generated', 'item-images.json'),
  path.join(srcDir, 'lib', 'colors.ts'),
  path.join(srcDir, 'components', 'ui', 'SplashScreen.tsx'),
].map((p) => path.normalize(p));

// Tailwind color names that violate token rules
const TAILWIND_COLORS = [
  'red', 'blue', 'green', 'yellow', 'purple', 'amber', 'emerald',
  'stone', 'orange', 'gray', 'slate', 'zinc', 'neutral', 'cyan',
  'sky', 'indigo', 'violet', 'fuchsia', 'pink', 'rose', 'teal'
];

const TAILWIND_REGEX = new RegExp(
  `\\b(?:(?:dark|hover|focus|active):)?(?:bg|text|border|ring|fill|stroke)-(?:${TAILWIND_COLORS.join('|')})-(?:[0-9]+|50)(?:\\/[0-9]+)?\\b`,
  'g'
);

const HEX_REGEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const RGB_HSL_REGEX = /\b(?:rgb|rgba|hsl|hsla)\([^)]+\)/g;

function getSuggestedToken(match, type) {
  const m = match.toLowerCase();

  if (m.includes('amber') || m.includes('yellow') || m.includes('gold')) {
    if (m.startsWith('text')) return '--primary (or --accent-gold if warning/rating)';
    if (m.startsWith('bg')) return '--primary-light';
    if (m.startsWith('border')) return '--accent-ice (or --border-light)';
    return '--primary / --primary-light';
  }

  if (m.includes('purple') || m.includes('violet') || m.includes('indigo') || m.includes('emerald') || m.includes('teal')) {
    if (m.startsWith('text')) return '--primary';
    if (m.startsWith('bg')) return '--primary-light';
    return '--primary-light / --primary';
  }

  if (m.includes('red')) {
    if (m.startsWith('bg')) return '--bg-surface (or --bg-surface-alt)';
    if (m.startsWith('text')) return '--accent-red';
    if (m.startsWith('border')) return '--accent-red (or --border-light)';
    return '--accent-red';
  }

  if (m.includes('green')) {
    if (m.startsWith('text')) return '--accent-green';
    if (m.startsWith('bg')) return '--primary-light';
    return '--accent-green';
  }

  if (m.includes('neutral') || m.includes('slate') || m.includes('zinc') || m.includes('stone') || m.includes('gray')) {
    if (m.includes('800') || m.includes('900') || m.includes('950')) {
      if (m.startsWith('text')) return '--text-main';
      return '--bg-surface-alt';
    }
    if (m.includes('500') || m.includes('600') || m.includes('400')) {
      return '--text-muted / --text-secondary';
    }
    if (m.includes('100') || m.includes('200') || m.includes('50')) {
      if (m.startsWith('border')) return '--border-light';
      return '--bg-surface-alt';
    }
    return '--border-light / --text-muted';
  }

  if (type === 'hex') {
    if (m === '#2b62c6') return '--primary';
    if (m === '#1e4fa8') return '--primary-hover';
    if (m === '#eef5fd') return '--primary-light';
    if (m === '#ff3b30') return '--accent-red';
    if (m === '#10b981') return '--accent-green';
    if (m === '#111827') return '--text-main';
    if (m === '#374151') return '--text-secondary';
    if (m === '#6b7280') return '--text-muted';
    if (m === '#9ca3af') return '--text-light';
    if (m === '#ffffff') return '--bg-surface / --text-inverse';
    if (m === '#e5e7eb') return '--border-light';
    if (m === '#d1d5db') return '--border-medium';
    return '--primary / appropriate token';
  }

  return '--primary / --bg-surface / --text-main';
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (/\.(tsx|ts|jsx|js|mjs|css)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export function runColorAudit({ writeReport = true } = {}) {
  const allFiles = walkDir(srcDir);
  const violations = [];

  for (const file of allFiles) {
    if (ALLOW_LIST.includes(path.normalize(file))) continue;

    const relativePath = path.relative(frontendRoot, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;

      // Ignore comments or CSS custom properties definition
      if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
        return;
      }

      // Ignore browser viewport themeColor, Razorpay SDK theme color, or console.log brand banner
      if (line.includes('themeColor:') || line.includes('theme: { color:') || line.includes('console.log')) {
        return;
      }

      // Check Tailwind palette violations
      let match;
      TAILWIND_REGEX.lastIndex = 0;
      while ((match = TAILWIND_REGEX.exec(line)) !== null) {
        const val = match[0];
        violations.push({
          file: relativePath,
          line: lineNum,
          value: val,
          type: 'tailwind',
          token: getSuggestedToken(val, 'tailwind'),
        });
      }

      // Check Hex literals (ignore inside var(--...) or standard SVG paths/ids)
      HEX_REGEX.lastIndex = 0;
      while ((match = HEX_REGEX.exec(line)) !== null) {
        const val = match[0];
        // Allow if immediately part of var(...) or data-attributes
        if (line.includes(`var(`) && line.indexOf(`var(`) < match.index) {
          const varClose = line.indexOf(')', match.index);
          if (varClose > match.index) {
            // inside var(--...)
            continue;
          }
        }
        violations.push({
          file: relativePath,
          line: lineNum,
          value: val,
          type: 'hex',
          token: getSuggestedToken(val, 'hex'),
        });
      }

      // Check raw rgb/hsl
      RGB_HSL_REGEX.lastIndex = 0;
      while ((match = RGB_HSL_REGEX.exec(line)) !== null) {
        const val = match[0];
        violations.push({
          file: relativePath,
          line: lineNum,
          value: val,
          type: 'rgb/hsl',
          token: getSuggestedToken(val, 'rgb/hsl'),
        });
      }
    });
  }

  if (writeReport) {
    let md = '# Part 4 Color Audit Report — Website Frontend\n\n';
    md += 'Generated by `website/frontend/scripts/color-audit.mjs`.\n\n';
    md += `**Total Violations Detected:** ${violations.length}\n\n`;

    md += '| File : Line | Value | Type | Suggested Website Token |\n';
    md += '|---|---|---|---|\n';

    for (const v of violations) {
      md += `| \`${v.file}:${v.line}\` | \`${v.value}\` | ${v.type} | \`${v.token}\` |\n`;
    }

    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, md, 'utf8');
    console.log(`✓ Color audit report generated at ${outputFile} with ${violations.length} violations.`);
  }

  return violations;
}

if (process.argv[1] && process.argv[1].endsWith('color-audit.mjs')) {
  const isCheckMode = process.argv.includes('--check');
  const violations = runColorAudit({ writeReport: !isCheckMode });
  if (isCheckMode && violations.length > 0) {
    console.error(`❌ Color check failed: ${violations.length} non-token color usages found.`);
    process.exit(1);
  }
}
