package com.aps.ficcado_payment_gateway_data;

import com.aps.ficcado_payment_gateway_data.client.CircuitBreaker;
import com.aps.ficcado_payment_gateway_data.client.CircuitBreakerOpenException;
import com.aps.ficcado_payment_gateway_data.client.RazorpayApiClient;
import com.aps.ficcado_payment_gateway_data.dto.RazorpayPaymentItem;
import com.aps.ficcado_payment_gateway_data.dto.RazorpayRefundResult;
import com.aps.ficcado_payment_gateway_data.entity.OutboxEvent;
import com.aps.ficcado_payment_gateway_data.entity.PaymentStatus;
import com.aps.ficcado_payment_gateway_data.entity.PaymentTransaction;
import com.aps.ficcado_payment_gateway_data.repository.OutboxEventRepository;
import com.aps.ficcado_payment_gateway_data.repository.PaymentTransactionRepository;
import com.aps.ficcado_payment_gateway_data.service.FiccadoDataSyncService;
import com.aps.ficcado_payment_gateway_data.service.FiccadoDataSyncService.SyncOutcome;
import com.aps.ficcado_payment_gateway_data.service.FiccadoDataSyncService.SyncResultType;
import com.aps.ficcado_payment_gateway_data.service.PaymentReconciliationScheduler;
import com.aps.ficcado_payment_gateway_data.service.PaymentReconciliationService;
import com.aps.ficcado_payment_gateway_data.service.PaymentReconciliationService.ReconciliationSummary;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
@org.springframework.test.context.TestPropertySource(properties = "app.reconciliation.enabled=true")
class PaymentReconciliationTest {

    @Autowired
    private PaymentReconciliationService reconciliationService;

    @Autowired
    private PaymentReconciliationScheduler reconciliationScheduler;

    @Autowired
    private PaymentTransactionRepository transactionRepository;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private MeterRegistry meterRegistry;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private RazorpayApiClient razorpayApiClient;

    @MockBean
    private FiccadoDataSyncService syncService;

    @BeforeEach
    void setUp() {
        transactionRepository.deleteAll();
        outboxEventRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM shedlock");
    }

    private PaymentTransaction createTransaction(String status, Instant createdAt, BigDecimal amount) {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        PaymentTransaction tx = PaymentTransaction.builder()
                .transactionId("FIC-TXN-REC-" + uid)
                .razorpayOrderId("order_rec_" + uid)
                .customerId(10L)
                .customerName("Reconciliation Customer")
                .customerEmail("reconcile_" + uid + "@ficcado.in")
                .customerPhone("+919876543210")
                .shippingAddress("123 Marine Drive, Mumbai 400001")
                .amount(amount != null ? amount : BigDecimal.valueOf(1499))
                .paymentStatus(status)
                .syncStatus("PENDING")
                .orderItemsJson("[{\"itemId\":1,\"itemName\":\"Chosen Tee\",\"itemSize\":\"L\",\"quantity\":1,\"price\":1499}]")
                .reconciliationRunCount(0)
                .createdAt(createdAt)
                .build();
        PaymentTransaction saved = transactionRepository.saveAndFlush(tx);
        if (createdAt != null) {
            jdbcTemplate.update("UPDATE payment_transactions SET created_at = ? WHERE id = ?",
                    java.sql.Timestamp.from(createdAt), saved.getId());
            saved = transactionRepository.findById(saved.getId()).orElse(saved);
        }
        return saved;
    }

    @Test
    @DisplayName("Branch 1: Payment captured and attempt has no sale -> completes sale, marks COMPLETED, notifies customer")
    void capturedPaymentCompletesSaleAndNotifiesCustomer() {
        Instant sixMinsAgo = Instant.now().minus(6, ChronoUnit.MINUTES);
        PaymentTransaction tx = createTransaction("PROCESSING", sixMinsAgo, BigDecimal.valueOf(1499));

        RazorpayPaymentItem item = RazorpayPaymentItem.builder()
                .id("pay_cap_123")
                .orderId(tx.getRazorpayOrderId())
                .status("captured")
                .captured(true)
                .amount(149900L)
                .build();

        when(razorpayApiClient.fetchPaymentsForOrder(tx.getRazorpayOrderId())).thenReturn(List.of(item));
        when(syncService.executeSyncSale(any())).thenAnswer(inv -> {
            PaymentTransaction arg = inv.getArgument(0);
            arg.setFiccadoInvoiceNumber("FIC-INV-RECON-1");
            arg.setFiccadoSaleId(501L);
            transactionRepository.save(arg);
            return new SyncOutcome(SyncResultType.SUCCESS, "Sale created");
        });

        ReconciliationSummary summary = reconciliationService.reconcileBatch();

        assertEquals(1, summary.getTotalProcessed());
        assertEquals(1, summary.getCompletedCount());

        PaymentTransaction updated = transactionRepository.findById(tx.getId()).orElseThrow();
        assertEquals("COMPLETED", updated.getPaymentStatus());
        assertEquals("pay_cap_123", updated.getRazorpayPaymentId());
        assertEquals(0, updated.getReconciliationRunCount());
        verify(syncService, times(1)).executeSyncSale(any());
    }

    @Test
    @DisplayName("Branch 2: Sale creation fails with business failure -> initiates refund, stores refund_id, marks REFUND_PENDING, notifies customer")
    void businessFailureInitiatesRefundAndNotifiesCustomer() {
        Instant tenMinsAgo = Instant.now().minus(10, ChronoUnit.MINUTES);
        PaymentTransaction tx = createTransaction("PROCESSING", tenMinsAgo, BigDecimal.valueOf(1499));

        RazorpayPaymentItem item = RazorpayPaymentItem.builder()
                .id("pay_cap_fail")
                .orderId(tx.getRazorpayOrderId())
                .status("captured")
                .captured(true)
                .amount(149900L)
                .build();

        RazorpayRefundResult refundResult = RazorpayRefundResult.builder()
                .id("rfnd_bus_999")
                .paymentId("pay_cap_fail")
                .status("processed")
                .amount(149900L)
                .build();

        when(razorpayApiClient.fetchPaymentsForOrder(tx.getRazorpayOrderId())).thenReturn(List.of(item));
        when(syncService.executeSyncSale(any())).thenReturn(
                new SyncOutcome(SyncResultType.BUSINESS_FAILURE, "Insufficient inventory stock")
        );
        when(razorpayApiClient.initiateRefund(eq("pay_cap_fail"), any(), any())).thenReturn(refundResult);

        ReconciliationSummary summary = reconciliationService.reconcileBatch();

        assertEquals(1, summary.getTotalProcessed());
        assertEquals(1, summary.getRefundPendingCount());

        PaymentTransaction updated = transactionRepository.findById(tx.getId()).orElseThrow();
        assertEquals("REFUND_PENDING", updated.getPaymentStatus());
        assertEquals("rfnd_bus_999", updated.getRefundId());
        verify(razorpayApiClient, times(1)).initiateRefund(eq("pay_cap_fail"), any(), any());
        verify(syncService, times(1)).saveOutboxEvent(any(), eq("REFUND_PENDING"), any());
    }

    @Test
    @DisplayName("Branch 2B: Transient failure retries up to 6 runs, then starts refund and marks REFUND_PENDING")
    void transientFailureRetriedUpTo6RunsThenRefunds() {
        Instant fifteenMinsAgo = Instant.now().minus(15, ChronoUnit.MINUTES);
        PaymentTransaction tx = createTransaction("PROCESSING", fifteenMinsAgo, BigDecimal.valueOf(1499));
        tx.setReconciliationRunCount(4);
        transactionRepository.saveAndFlush(tx);

        RazorpayPaymentItem item = RazorpayPaymentItem.builder()
                .id("pay_transient_1")
                .orderId(tx.getRazorpayOrderId())
                .status("captured")
                .captured(true)
                .amount(149900L)
                .build();

        when(razorpayApiClient.fetchPaymentsForOrder(tx.getRazorpayOrderId())).thenReturn(List.of(item));
        when(syncService.executeSyncSale(any())).thenReturn(
                new SyncOutcome(SyncResultType.TRANSIENT_FAILURE, "Timeout connecting to Ficcado-Data")
        );

        // Run 5: Should stay in PROCESSING with count = 5
        ReconciliationSummary run5 = reconciliationService.reconcileBatch();
        assertEquals(1, run5.getRetryQueuedCount());

        PaymentTransaction afterRun5 = transactionRepository.findById(tx.getId()).orElseThrow();
        assertEquals("PROCESSING", afterRun5.getPaymentStatus());
        assertEquals(5, afterRun5.getReconciliationRunCount());
        assertNull(afterRun5.getRefundId());

        // Run 6: Reaches 6 transient failures -> starts refund
        when(razorpayApiClient.initiateRefund(eq("pay_transient_1"), any(), any())).thenReturn(
                RazorpayRefundResult.builder().id("rfnd_after_6_runs").status("processed").build()
        );

        ReconciliationSummary run6 = reconciliationService.reconcileBatch();
        assertEquals(1, run6.getRefundPendingCount());

        PaymentTransaction afterRun6 = transactionRepository.findById(tx.getId()).orElseThrow();
        assertEquals("REFUND_PENDING", afterRun6.getPaymentStatus());
        assertEquals("rfnd_after_6_runs", afterRun6.getRefundId());
        verify(razorpayApiClient, times(1)).initiateRefund(eq("pay_transient_1"), any(), any());
    }

    @Test
    @DisplayName("Idempotent Refund Guard: Refund is created ONCE even if reconciliation runs twice or concurrently")
    void refundCreatedOnceEvenIfJobRunsTwice() {
        Instant thirtyMinsAgo = Instant.now().minus(30, ChronoUnit.MINUTES);
        PaymentTransaction tx = createTransaction("REFUND_PENDING", thirtyMinsAgo, BigDecimal.valueOf(1499));
        tx.setRefundId("rfnd_already_created");
        tx.setRazorpayPaymentId("pay_existing_123");
        transactionRepository.saveAndFlush(tx);

        when(razorpayApiClient.fetchRefundStatus("rfnd_already_created")).thenReturn("pending");

        // First run
        reconciliationService.reconcileBatch();
        // Second run
        reconciliationService.reconcileBatch();

        // Must NEVER call initiateRefund again
        verify(razorpayApiClient, never()).initiateRefund(any(), any(), any());
        assertEquals("REFUND_PENDING", transactionRepository.findById(tx.getId()).orElseThrow().getPaymentStatus());
    }

    @Test
    @DisplayName("Branch 3: All payments failed -> marks FAILED and notifies customer")
    void allPaymentsFailedMarksFailedAndNotifiesCustomer() {
        Instant twentyMinsAgo = Instant.now().minus(20, ChronoUnit.MINUTES);
        PaymentTransaction tx = createTransaction("PROCESSING", twentyMinsAgo, BigDecimal.valueOf(1499));

        RazorpayPaymentItem failedPayment = RazorpayPaymentItem.builder()
                .id("pay_failed_1")
                .orderId(tx.getRazorpayOrderId())
                .status("failed")
                .captured(false)
                .errorCode("BAD_REQUEST_ERROR")
                .errorDescription("Bank declined transaction")
                .build();

        when(razorpayApiClient.fetchPaymentsForOrder(tx.getRazorpayOrderId())).thenReturn(List.of(failedPayment));

        ReconciliationSummary summary = reconciliationService.reconcileBatch();

        assertEquals(1, summary.getFailedCount());
        PaymentTransaction updated = transactionRepository.findById(tx.getId()).orElseThrow();
        assertEquals("FAILED", updated.getPaymentStatus());
        verify(syncService, times(1)).saveOutboxEvent(any(), eq("FAILED"), any());
    }

    @Test
    @DisplayName("Branch 4: No payment and older than 48 hours -> marks EXPIRED with strictly no customer notification")
    void olderThan48HoursWithoutPaymentMarksExpiredWithoutNotification() {
        Instant fiftyHoursAgo = Instant.now().minus(50, ChronoUnit.HOURS);
        PaymentTransaction tx = createTransaction("CREATED", fiftyHoursAgo, BigDecimal.valueOf(1499));

        when(razorpayApiClient.fetchPaymentsForOrder(tx.getRazorpayOrderId())).thenReturn(Collections.emptyList());

        ReconciliationSummary summary = reconciliationService.reconcileBatch();

        assertEquals(1, summary.getExpiredCount());
        PaymentTransaction updated = transactionRepository.findById(tx.getId()).orElseThrow();
        assertEquals("EXPIRED", updated.getPaymentStatus());
        // Verify no outbox notification for EXPIRED
        verify(syncService, never()).saveOutboxEvent(any(), eq("EXPIRED"), any());
    }

    @Test
    @DisplayName("Branch 5: Refund processed at Razorpay -> marks REFUNDED and notifies customer")
    void refundProcessedMarksRefunded() {
        Instant twentyMinsAgo = Instant.now().minus(20, ChronoUnit.MINUTES);
        PaymentTransaction tx = createTransaction("REFUND_PENDING", twentyMinsAgo, BigDecimal.valueOf(1499));
        tx.setRefundId("rfnd_to_process");
        transactionRepository.saveAndFlush(tx);

        when(razorpayApiClient.fetchRefundStatus("rfnd_to_process")).thenReturn("processed");

        ReconciliationSummary summary = reconciliationService.reconcileBatch();

        assertEquals(1, summary.getRefundedCount());
        PaymentTransaction updated = transactionRepository.findById(tx.getId()).orElseThrow();
        assertEquals("REFUNDED", updated.getPaymentStatus());
        verify(syncService, times(1)).saveOutboxEvent(any(), eq("REFUNDED"), any());
    }

    @Test
    @DisplayName("Batch Resilience: Failure on one attempt never stops the rest of the batch")
    void batchContinuesAfterOneAttemptFails() {
        Instant tenMinsAgo = Instant.now().minus(10, ChronoUnit.MINUTES);
        PaymentTransaction tx1 = createTransaction("PROCESSING", tenMinsAgo, BigDecimal.valueOf(999));
        PaymentTransaction tx2 = createTransaction("PROCESSING", tenMinsAgo, BigDecimal.valueOf(1999));

        // Candidate 1 throws error
        when(razorpayApiClient.fetchPaymentsForOrder(tx1.getRazorpayOrderId()))
                .thenThrow(new RuntimeException("Simulated Razorpay network glitch"));

        // Candidate 2 succeeds cleanly
        RazorpayPaymentItem item2 = RazorpayPaymentItem.builder()
                .id("pay_batch_ok")
                .orderId(tx2.getRazorpayOrderId())
                .status("captured")
                .captured(true)
                .amount(199900L)
                .build();
        when(razorpayApiClient.fetchPaymentsForOrder(tx2.getRazorpayOrderId())).thenReturn(List.of(item2));
        when(syncService.executeSyncSale(any())).thenAnswer(inv -> {
            PaymentTransaction p = inv.getArgument(0);
            p.setFiccadoSaleId(502L);
            transactionRepository.save(p);
            return new SyncOutcome(SyncResultType.SUCCESS, "OK");
        });

        ReconciliationSummary summary = reconciliationService.reconcileBatch();

        assertEquals(2, summary.getTotalProcessed());
        assertEquals(1, summary.getErrorCount());
        assertEquals(1, summary.getCompletedCount());

        // Verify Candidate 2 completed despite Candidate 1's error
        PaymentTransaction updated2 = transactionRepository.findById(tx2.getId()).orElseThrow();
        assertEquals("COMPLETED", updated2.getPaymentStatus());
    }

    @Test
    @DisplayName("End-to-End Scenario: User paid, browser closed, webhook lost, reconciliation completes the sale")
    void userPaidBrowserClosedWebhookLostReconciliationCompletesSale() {
        // Customer initiated checkout 15 minutes ago; status stayed CREATED because browser closed and webhook lost
        Instant fifteenMinsAgo = Instant.now().minus(15, ChronoUnit.MINUTES);
        PaymentTransaction abandonedTx = createTransaction("CREATED", fifteenMinsAgo, BigDecimal.valueOf(2499));

        // Razorpay shows payment was captured
        RazorpayPaymentItem capturedItem = RazorpayPaymentItem.builder()
                .id("pay_lost_webhook_777")
                .orderId(abandonedTx.getRazorpayOrderId())
                .status("captured")
                .captured(true)
                .amount(249900L)
                .method("upi")
                .build();

        when(razorpayApiClient.fetchPaymentsForOrder(abandonedTx.getRazorpayOrderId())).thenReturn(List.of(capturedItem));
        when(syncService.executeSyncSale(any())).thenAnswer(inv -> {
            PaymentTransaction arg = inv.getArgument(0);
            arg.setFiccadoInvoiceNumber("FIC-INV-REC-RECOVERED");
            arg.setFiccadoSaleId(888L);
            transactionRepository.save(arg);
            return new SyncOutcome(SyncResultType.SUCCESS, "Recovered sale created");
        });

        ReconciliationSummary summary = reconciliationService.reconcileBatch();

        assertEquals(1, summary.getCompletedCount());
        PaymentTransaction recovered = transactionRepository.findById(abandonedTx.getId()).orElseThrow();
        assertEquals("COMPLETED", recovered.getPaymentStatus());
        assertEquals("pay_lost_webhook_777", recovered.getRazorpayPaymentId());
        assertEquals("FIC-INV-REC-RECOVERED", recovered.getFiccadoInvoiceNumber());
        assertEquals(888L, recovered.getFiccadoSaleId());
    }

    @Test
    @DisplayName("ShedLock: Lock table prevents two simultaneous runs")
    void shedLockPreventsSimultaneousRuns() {
        // Pre-insert lock row in shedlock table with future expiration (lock held by another node)
        jdbcTemplate.update(
                "INSERT INTO shedlock (name, lock_until, locked_at, locked_by) VALUES (?, ?, ?, ?)",
                "paymentReconciliationLock",
                java.sql.Timestamp.from(Instant.now().plus(5, ChronoUnit.MINUTES)),
                java.sql.Timestamp.from(Instant.now()),
                "other-cluster-node-99"
        );

        // Run scheduler; ShedLock should recognize existing active lock and refuse execution
        assertDoesNotThrow(() -> reconciliationScheduler.runReconciliation());

        // Zero candidate calls should have executed through the scheduler
        verify(razorpayApiClient, never()).fetchPaymentsForOrder(any());
    }
}
