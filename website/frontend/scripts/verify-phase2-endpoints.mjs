// =============================================================================
// Phase 2 Direct Verification Script
// Starts production server on port 3005, verifies responses & headers, and exits
// =============================================================================

import { spawn } from 'node:child_process';

const PORT = 3005;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRoute(path) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
  const text = await res.text();
  return {
    status: res.status,
    contentType: res.headers.get('content-type'),
    body: text,
  };
}

async function main() {
  console.log(`Starting Next.js server on port ${PORT}...`);
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    shell: true,
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  // Wait for server to start
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/robots.txt`);
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch {
      await wait(500);
    }
  }

  if (!ready) {
    console.error('Server failed to start in time.');
    server.kill();
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('🔍 PHASE 2 ENDPOINT AUDIT & VERIFICATION');
  console.log('====================================================');

  const routes = [
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
    '/llms-full.txt',
    '/humans.txt',
    '/categories/t-shirts',
    '/faq',
  ];

  for (const route of routes) {
    const { status, contentType, body } = await fetchRoute(route);
    console.log(`\nRoute: ${route}`);
    console.log(`Status: ${status}`);
    console.log(`Content-Type: ${contentType}`);
    console.log(`Body Snippet:`);
    const preview = body.slice(0, 300).replace(/\n\s*\n/g, '\n');
    console.log(preview + (body.length > 300 ? '\n...[truncated]' : ''));

    if (status !== 200) {
      console.error(`❌ FAILED: ${route} returned status ${status}`);
      server.kill();
      process.exit(1);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 2 ENDPOINTS VERIFIED & RETURNING 200 OK');
  console.log('====================================================\n');

  server.kill('SIGINT');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
