package com.aps.ficcado_payment_gateway_data.service;

import com.aps.ficcado_payment_gateway_data.client.CircuitBreakerOpenException;
import com.aps.ficcado_payment_gateway_data.client.RazorpayApiClient;
import com.aps.ficcado_payment_gateway_data.dto.RazorpayPaymentItem;
import com.aps.ficcado_payment_gateway_data.dto.RazorpayRefundResult;
import com.aps.ficcado_payment_gateway_data.entity.PaymentStatus;
import com.aps.ficcado_payment_gateway_data.entity.PaymentTransaction;
import com.aps.ficcado_payment_gateway_data.repository.PaymentTransactionRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Razorpay Payment Reconciliation Service (Part 2 Phase P2-8, C-4).
 * Runs every 10 minutes guarded by ShedLock to ensure single-instance execution.
 * Reconciles unconfirmed, abandoned, slow, and business-failed payments against Razorpay.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentReconciliationService {

    private final PaymentTransactionRepository transactionRepository;
    private final FiccadoDataSyncService syncService;
    private final RazorpayApiClient razorpayApiClient;
    private final MeterRegistry meterRegistry;

    @Value("${app.reconciliation.batch-size:100}")
    private int batchSize = 100;

    @Value("${app.reconciliation.max-transient-retries:6}")
    private int maxTransientRetries = 6;

    @Data
    @Builder
    public static class ReconciliationSummary {
        private int totalProcessed;
        private int completedCount;
        private int refundPendingCount;
        private int refundedCount;
        private int failedCount;
        private int expiredCount;
        private int retryQueuedCount;
        private int errorCount;
        private long durationMs;
    }

    /**
     * Executes one complete reconciliation batch.
     * Guaranteed to continue processing remaining items if any single item errors.
     */
    public ReconciliationSummary reconcileBatch() {
        long startTime = System.currentTimeMillis();
        meterRegistry.counter("ficcado.reconciliation.runs").increment();

        log.info("Starting payment reconciliation run at {}", Instant.now());

        Instant now = Instant.now();
        Instant olderThan = now.minus(5, ChronoUnit.MINUTES);
        List<String> activeStatuses = List.of(
                PaymentStatus.CREATED.name(),
                PaymentStatus.PROCESSING.name(),
                PaymentStatus.REFUND_PENDING.name()
        );

        List<PaymentTransaction> candidates = transactionRepository.findReconciliationCandidates(
                activeStatuses,
                olderThan,
                PageRequest.of(0, batchSize)
        );

        log.info("Found {} payment reconciliation candidate transactions", candidates.size());

        int completed = 0;
        int refundPending = 0;
        int refunded = 0;
        int failed = 0;
        int expired = 0;
        int retryQueued = 0;
        int errors = 0;

        for (PaymentTransaction candidate : candidates) {
            try {
                Outcome outcome = processCandidate(candidate.getId(), now);
                switch (outcome) {
                    case COMPLETED -> completed++;
                    case REFUND_PENDING -> refundPending++;
                    case REFUNDED -> refunded++;
                    case FAILED -> failed++;
                    case EXPIRED -> expired++;
                    case RETRY_QUEUED -> retryQueued++;
                    case ERROR -> errors++;
                    case NO_OP -> {}
                }
                meterRegistry.counter("ficcado.reconciliation.outcomes", "outcome", outcome.name()).increment();
            } catch (Exception e) {
                errors++;
                log.error("Unhandled error reconciling transaction ID {}: {}", candidate.getId(), e.getMessage(), e);
                meterRegistry.counter("ficcado.reconciliation.outcomes", "outcome", "ERROR").increment();
            }
        }

        long durationMs = System.currentTimeMillis() - startTime;
        meterRegistry.timer("ficcado.reconciliation.duration").record(durationMs, TimeUnit.MILLISECONDS);

        ReconciliationSummary summary = ReconciliationSummary.builder()
                .totalProcessed(candidates.size())
                .completedCount(completed)
                .refundPendingCount(refundPending)
                .refundedCount(refunded)
                .failedCount(failed)
                .expiredCount(expired)
                .retryQueuedCount(retryQueued)
                .errorCount(errors)
                .durationMs(durationMs)
                .build();

        log.info("Reconciliation run finished in {} ms. Summary: [total={}, completed={}, refundPending={}, " +
                        "refunded={}, failed={}, expired={}, retryQueued={}, errors={}]",
                durationMs, candidates.size(), completed, refundPending, refunded, failed, expired, retryQueued, errors);

        return summary;
    }

    public enum Outcome {
        COMPLETED,
        REFUND_PENDING,
        REFUNDED,
        FAILED,
        EXPIRED,
        RETRY_QUEUED,
        ERROR,
        NO_OP
    }

    /**
     * Reconciles a single transaction inside its own transactional boundary.
     */
    @Transactional
    public Outcome processCandidate(Long transactionId, Instant now) {
        PaymentTransaction tx = transactionRepository.findById(transactionId).orElse(null);
        if (tx == null) {
            return Outcome.NO_OP;
        }

        tx.setLastReconciledAt(now);

        // Branch 5: Already in REFUND_PENDING -> check if Razorpay finished processing the refund
        if (PaymentStatus.REFUND_PENDING.name().equals(tx.getPaymentStatus())) {
            return checkPendingRefund(tx);
        }

        // Branch 4: Older than 48 hours -> expire if no payment
        boolean olderThan48Hours = tx.getCreatedAt().isBefore(now.minus(48, ChronoUnit.HOURS));

        List<RazorpayPaymentItem> payments;
        try {
            payments = razorpayApiClient.fetchPaymentsForOrder(tx.getRazorpayOrderId());
        } catch (CircuitBreakerOpenException cbe) {
            log.warn("Circuit breaker OPEN. Skipping transaction {}: {}", tx.getTransactionId(), cbe.getMessage());
            return Outcome.ERROR;
        } catch (Exception e) {
            log.error("Failed to fetch Razorpay payments for transaction {}: {}", tx.getTransactionId(), e.getMessage());
            return Outcome.ERROR;
        }

        Optional<RazorpayPaymentItem> capturedOpt = payments.stream()
                .filter(RazorpayPaymentItem::isCaptured)
                .findFirst();

        if (capturedOpt.isPresent()) {
            RazorpayPaymentItem captured = capturedOpt.get();
            if (tx.getRazorpayPaymentId() == null) {
                tx.setRazorpayPaymentId(captured.getId());
            }

            if (PaymentStatus.CREATED.name().equals(tx.getPaymentStatus())) {
                tx.transitionTo(PaymentStatus.PROCESSING, null);
            }

            // Branch 1: Payment captured and attempt has no sale
            if (tx.getFiccadoSaleId() == null) {
                return handleCapturedPayment(tx, captured);
            } else {
                // Sale already exists, ensure status is COMPLETED
                if (!PaymentStatus.COMPLETED.name().equals(tx.getPaymentStatus())) {
                    tx.transitionTo(PaymentStatus.COMPLETED, null);
                    transactionRepository.save(tx);
                }
                return Outcome.COMPLETED;
            }
        }

        // Check if all payment attempts failed
        boolean allFailed = !payments.isEmpty() && payments.stream().allMatch(RazorpayPaymentItem::isFailed);
        if (allFailed) {
            // Branch 3: All payments failed
            log.info("All payments failed for transaction {}. Transitioning to FAILED.", tx.getTransactionId());
            tx.transitionTo(PaymentStatus.FAILED, "All payment attempts failed at Razorpay");
            tx.setSyncStatus("PAYMENT_FAILED");
            transactionRepository.save(tx);
            syncService.saveOutboxEvent(tx, "FAILED", "Payment failed");
            return Outcome.FAILED;
        }

        // If no payment was made and it is older than 48 hours: Branch 4
        if (olderThan48Hours) {
            log.info("No payment captured within 48 hours for transaction {}. Transitioning to EXPIRED.", tx.getTransactionId());
            tx.transitionTo(PaymentStatus.EXPIRED, "No payment captured within 48 hours");
            tx.setSyncStatus("EXPIRED");
            transactionRepository.save(tx);
            // Requirement: "No payment and older than 48 hours: mark EXPIRED (no notification)."
            return Outcome.EXPIRED;
        }

        // Younger than 48 hours and no captured/failed status yet: leave in current status
        transactionRepository.save(tx);
        return Outcome.NO_OP;
    }

    private Outcome handleCapturedPayment(PaymentTransaction tx, RazorpayPaymentItem captured) {
        FiccadoDataSyncService.SyncOutcome syncOutcome = syncService.executeSyncSale(tx);
        PaymentTransaction freshTx = transactionRepository.findById(tx.getId()).orElse(tx);

        if (syncOutcome.type() == FiccadoDataSyncService.SyncResultType.SUCCESS) {
            log.info("Reconciliation successfully created sale for transaction {}", freshTx.getTransactionId());
            if (PaymentStatus.CREATED.name().equals(freshTx.getPaymentStatus())) {
                freshTx.transitionTo(PaymentStatus.PROCESSING, null);
            }
            if (!PaymentStatus.COMPLETED.name().equals(freshTx.getPaymentStatus())) {
                freshTx.transitionTo(PaymentStatus.COMPLETED, null);
            }
            freshTx.setSyncStatus("SYNCED_TO_FICCADO_DATA");
            freshTx.setReconciliationRunCount(0);
            transactionRepository.save(freshTx);
            return Outcome.COMPLETED;
        }

        if (syncOutcome.type() == FiccadoDataSyncService.SyncResultType.BUSINESS_FAILURE) {
            // Branch 2: Business failure -> Start refund immediately
            log.warn("Business failure on transaction {}: {}. Initiating refund.",
                    freshTx.getTransactionId(), syncOutcome.message());
            return executeRefund(freshTx, captured.getId(), "Business failure: " + syncOutcome.message());
        }

        // Transient failure
        int runCount = (freshTx.getReconciliationRunCount() != null ? freshTx.getReconciliationRunCount() : 0) + 1;
        freshTx.setReconciliationRunCount(runCount);

        if (runCount >= maxTransientRetries) {
            // Transient failures continued for 6 reconciliation runs (about 1 hour) -> initiate refund
            log.error("Transient sync failures continued for {} runs on transaction {}. Initiating refund.",
                    runCount, freshTx.getTransactionId());
            return executeRefund(freshTx, captured.getId(), "Sync failures exceeded " + maxTransientRetries + " runs (" + syncOutcome.message() + ")");
        } else {
            log.info("Transient sync failure on transaction {} (run {}/{}). Will retry next run.",
                    freshTx.getTransactionId(), runCount, maxTransientRetries);
            freshTx.setSyncStatus("RETRY_QUEUED");
            transactionRepository.save(freshTx);
            return Outcome.RETRY_QUEUED;
        }
    }

    /**
     * Executes refund via Razorpay refund API and transitions to REFUND_PENDING.
     * Guarantees refund is NEVER created twice by verifying tx.refundId is absent.
     */
    private Outcome executeRefund(PaymentTransaction tx, String paymentId, String reason) {
        if (tx.getRefundId() == null) {
            try {
                RazorpayRefundResult refundResult = razorpayApiClient.initiateRefund(
                        paymentId,
                        tx.getAmount(),
                        reason
                );
                tx.setRefundId(refundResult.getId());
                log.info("Razorpay refund initiated with refundId={} for transaction={}",
                        refundResult.getId(), tx.getTransactionId());
            } catch (Exception e) {
                log.error("Failed to initiate Razorpay refund for transaction {}: {}",
                        tx.getTransactionId(), e.getMessage(), e);
                tx.setFailureReason("Failed to initiate refund: " + e.getMessage());
                transactionRepository.save(tx);
                return Outcome.ERROR;
            }
        } else {
            log.info("Refund already created previously with refundId={} for transaction={}",
                    tx.getRefundId(), tx.getTransactionId());
        }

        tx.transitionTo(PaymentStatus.REFUND_PENDING, reason);
        tx.setSyncStatus("REFUND_PENDING");
        transactionRepository.save(tx);

        syncService.saveOutboxEvent(
                tx,
                "REFUND_PENDING",
                "Your payment could not be processed into an order (" + reason + "). A full refund has been initiated. Please try placing your order again."
        );

        return Outcome.REFUND_PENDING;
    }

    /**
     * Checks if Razorpay has processed a pending refund, and transitions to REFUNDED.
     */
    private Outcome checkPendingRefund(PaymentTransaction tx) {
        if (tx.getRefundId() == null) {
            // If refund ID was somehow not recorded, re-attempt initiating refund if payment ID is available
            if (tx.getRazorpayPaymentId() != null) {
                return executeRefund(tx, tx.getRazorpayPaymentId(), "Re-initiating missing refund");
            }
            return Outcome.ERROR;
        }

        try {
            String status = razorpayApiClient.fetchRefundStatus(tx.getRefundId());
            if ("processed".equalsIgnoreCase(status)) {
                log.info("Razorpay refund {} marked as processed. Transitioning transaction {} to REFUNDED.",
                        tx.getRefundId(), tx.getTransactionId());
                tx.transitionTo(PaymentStatus.REFUNDED, "Refund processed by Razorpay");
                tx.setSyncStatus("REFUNDED");
                transactionRepository.save(tx);
                syncService.saveOutboxEvent(tx, "REFUNDED", "Refund completed successfully");
                return Outcome.REFUNDED;
            }
        } catch (Exception e) {
            log.error("Failed to check refund status for {}: {}", tx.getRefundId(), e.getMessage());
            return Outcome.ERROR;
        }

        return Outcome.REFUND_PENDING;
    }
}
