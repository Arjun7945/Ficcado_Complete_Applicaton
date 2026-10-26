import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');

test('P2-9: k6 Load Test Scripts are configured with strict thresholds', () => {
  const loadTestsDir = path.join(rootDir, 'loadtests');
  assert.ok(fs.existsSync(loadTestsDir), 'loadtests/ directory must exist');

  const requiredScripts = [
    'login-session.js',
    'product-catalog.js',
    'wishlist-flow.js',
    'checkout-order.js',
    'full-flow.js',
  ];

  for (const script of requiredScripts) {
    const scriptPath = path.join(loadTestsDir, script);
    assert.ok(fs.existsSync(scriptPath), `loadtests/${script} must exist`);
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert.ok(content.includes("'p(95)<800'"), `${script} must enforce p95 < 800ms threshold`);
    assert.ok(content.includes("'rate<0.01'"), `${script} must enforce error rate < 1% threshold`);
  }
});

test('P2-9: CI/CD Pipeline (.github/workflows/ci-cd.yaml) enforces all quality gates and pinned versions', () => {
  const ciPath = path.join(rootDir, '.github', 'workflows', 'ci-cd.yaml');
  assert.ok(fs.existsSync(ciPath), '.github/workflows/ci-cd.yaml must exist');

  const ciContent = fs.readFileSync(ciPath, 'utf8');

  // Verify Quality Gates
  assert.ok(ciContent.includes('check:brand'), 'CI must execute brand check');
  assert.ok(ciContent.includes('check:devices'), 'CI must execute device checker');
  assert.ok(ciContent.includes('typecheck'), 'CI must execute typecheck');
  assert.ok(ciContent.includes('lint'), 'CI must execute lint');
  assert.ok(ciContent.includes('npm test'), 'CI must execute frontend tests');
  assert.ok(ciContent.includes('clean test package'), 'CI must test and package backends');
  assert.ok(ciContent.includes('deploy-gate'), 'CI must have a deployment gate');

  // Verify pinned service versions matching infra/docker-compose.yml
  assert.ok(ciContent.includes('postgres:18.6-alpine'), 'PostgreSQL must be pinned to 18.6-alpine');
  assert.ok(ciContent.includes('redis:7.4.2-alpine'), 'Redis must be pinned to 7.4.2-alpine');
  assert.ok(ciContent.includes('rabbitmq:4.0.7-management-alpine'), 'RabbitMQ must be pinned to 4.0.7-management-alpine');
});

test('AUD-11: Scaling Notes documents capacity, connection limits, and PgBouncer guidance', () => {
  const scalingPath = path.join(rootDir, 'docs', 'SCALING_NOTES.md');
  assert.ok(fs.existsSync(scalingPath), 'docs/SCALING_NOTES.md must exist');

  const content = fs.readFileSync(scalingPath, 'utf8');
  assert.ok(content.includes('max_connections'), 'Must document PostgreSQL max_connections limit');
  assert.ok(content.includes('60'), 'Must document total allocated connections (30 + 15 + 15 = 60)');
  assert.ok(content.includes('pool_mode = transaction'), 'Must document transaction pooling mode');
  assert.ok(content.includes('PgBouncer'), 'Must provide PgBouncer guidance');
});

test('P2-9: Correlation ID filters and PII masking converters exist across all 3 backends', () => {
  const crmFilter = path.join(rootDir, 'crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/logging/CorrelationIdFilter.java');
  const webFilter = path.join(rootDir, 'website/backend/ficcado_website_data/src/main/java/com/aps/ficcado_website_data/logging/CorrelationIdFilter.java');
  const payFilter = path.join(rootDir, 'payment/backend/ficcado_payment_gateway_data/src/main/java/com/aps/ficcado_payment_gateway_data/logging/CorrelationIdFilter.java');

  assert.ok(fs.existsSync(crmFilter), 'CRM CorrelationIdFilter must exist');
  assert.ok(fs.existsSync(webFilter), 'Website CorrelationIdFilter must exist');
  assert.ok(fs.existsSync(payFilter), 'Payment CorrelationIdFilter must exist');

  const crmConverter = path.join(rootDir, 'crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/logging/PiiMaskingConverter.java');
  const webConverter = path.join(rootDir, 'website/backend/ficcado_website_data/src/main/java/com/aps/ficcado_website_data/logging/PiiMaskingConverter.java');
  const payConverter = path.join(rootDir, 'payment/backend/ficcado_payment_gateway_data/src/main/java/com/aps/ficcado_payment_gateway_data/logging/PiiMaskingConverter.java');

  assert.ok(fs.existsSync(crmConverter), 'CRM PiiMaskingConverter must exist');
  assert.ok(fs.existsSync(webConverter), 'Website PiiMaskingConverter must exist');
  assert.ok(fs.existsSync(payConverter), 'Payment PiiMaskingConverter must exist');
});
