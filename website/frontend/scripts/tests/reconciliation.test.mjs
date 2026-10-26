import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(process.cwd(), '../..');

describe('Phase P2-8: Razorpay Reconciliation Contract & Architecture', () => {

    it('1. ShedLock configuration and distributed locking table', () => {
        const shedLockConfigPath = path.join(
            ROOT_DIR,
            'payment/backend/ficcado_payment_gateway_data/src/main/java/com/aps/ficcado_payment_gateway_data/config/ShedLockConfig.java'
        );
        assert.ok(fs.existsSync(shedLockConfigPath), 'ShedLockConfig.java must exist');
        const content = fs.readFileSync(shedLockConfigPath, 'utf8');
        assert.match(content, /@EnableSchedulerLock/);
        assert.match(content, /JdbcTemplateLockProvider/);

        const v3Migration = path.join(
            ROOT_DIR,
            'payment/backend/ficcado_payment_gateway_data/src/main/resources/db/migration/V3__reconciliation_and_shedlock.sql'
        );
        assert.ok(fs.existsSync(v3Migration), 'V3__reconciliation_and_shedlock.sql must exist');
        const v3Sql = fs.readFileSync(v3Migration, 'utf8');
        assert.match(v3Sql, /CREATE TABLE IF NOT EXISTS shedlock/i);
        assert.match(v3Sql, /refund_id VARCHAR\(100\)/i);
        assert.match(v3Sql, /reconciliation_run_count INT/i);
        assert.match(v3Sql, /idx_payment_tx_reconciliation/i);
    });

    it('2. 10-Minute Scheduler with ShedLock lock annotations', () => {
        const schedulerPath = path.join(
            ROOT_DIR,
            'payment/backend/ficcado_payment_gateway_data/src/main/java/com/aps/ficcado_payment_gateway_data/service/PaymentReconciliationScheduler.java'
        );
        assert.ok(fs.existsSync(schedulerPath), 'PaymentReconciliationScheduler.java must exist');
        const content = fs.readFileSync(schedulerPath, 'utf8');
        assert.match(content, /@Scheduled\(cron = "\$\{app\.reconciliation\.cron:0 \*\/10 \* \* \* \*\}"\)/);
        assert.match(content, /@SchedulerLock\(name = "paymentReconciliationLock"/);
    });

    it('3. Circuit breaker and timeout protection on Razorpay API calls', () => {
        const cbPath = path.join(
            ROOT_DIR,
            'payment/backend/ficcado_payment_gateway_data/src/main/java/com/aps/ficcado_payment_gateway_data/client/CircuitBreaker.java'
        );
        assert.ok(fs.existsSync(cbPath), 'CircuitBreaker.java must exist');
        const cbContent = fs.readFileSync(cbPath, 'utf8');
        assert.match(cbContent, /enum State \{[\s\S]*CLOSED,[\s\S]*OPEN,[\s\S]*HALF_OPEN/);

        const clientPath = path.join(
            ROOT_DIR,
            'payment/backend/ficcado_payment_gateway_data/src/main/java/com/aps/ficcado_payment_gateway_data/client/DefaultRazorpayApiClient.java'
        );
        assert.ok(fs.existsSync(clientPath), 'DefaultRazorpayApiClient.java must exist');
        const clientContent = fs.readFileSync(clientPath, 'utf8');
        assert.match(clientContent, /setConnectTimeout/);
        assert.match(clientContent, /setReadTimeout/);
        assert.match(clientContent, /circuitBreaker\.allowExecution\(\)/);
    });

    it('4. Reconciliation service implements all 5 branches and batch resilience', () => {
        const servicePath = path.join(
            ROOT_DIR,
            'payment/backend/ficcado_payment_gateway_data/src/main/java/com/aps/ficcado_payment_gateway_data/service/PaymentReconciliationService.java'
        );
        assert.ok(fs.existsSync(servicePath), 'PaymentReconciliationService.java must exist');
        const content = fs.readFileSync(servicePath, 'utf8');

        // Batch processing
        assert.match(content, /findReconciliationCandidates/);
        assert.match(content, /batchSize/);

        // Branch 1: Captured payment completes sale
        assert.match(content, /handleCapturedPayment/);
        assert.match(content, /executeSyncSale/);

        // Branch 2: Business failure triggers refund
        assert.match(content, /BUSINESS_FAILURE/);
        assert.match(content, /initiateRefund/);

        // Branch 2B: Transient failures retried for 6 runs
        assert.match(content, /maxTransientRetries/);

        // Branch 3: All payments failed
        assert.match(content, /allFailed/);
        assert.match(content, /FAILED/);

        // Branch 4: Older than 48 hours expired without notification
        assert.match(content, /olderThan48Hours/);
        assert.match(content, /EXPIRED/);

        // Branch 5: Refund processed
        assert.match(content, /checkPendingRefund/);
        assert.match(content, /REFUNDED/);

        // Idempotent refund guard
        assert.match(content, /tx\.getRefundId\(\) == null/);
    });

    it('5. Micrometer metrics for runs, duration timer, and per-outcome counters', () => {
        const servicePath = path.join(
            ROOT_DIR,
            'payment/backend/ficcado_payment_gateway_data/src/main/java/com/aps/ficcado_payment_gateway_data/service/PaymentReconciliationService.java'
        );
        const content = fs.readFileSync(servicePath, 'utf8');
        assert.match(content, /meterRegistry\.counter\("ficcado\.reconciliation\.runs"\)/);
        assert.match(content, /meterRegistry\.timer\("ficcado\.reconciliation\.duration"\)/);
        assert.match(content, /meterRegistry\.counter\("ficcado\.reconciliation\.outcomes", "outcome"/);
    });
});
