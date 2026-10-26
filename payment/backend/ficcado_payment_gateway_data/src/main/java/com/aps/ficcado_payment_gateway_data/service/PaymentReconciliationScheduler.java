package com.aps.ficcado_payment_gateway_data.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled cron job runner for Razorpay Payment Reconciliation (Part 2 Phase P2-8, C-4).
 * Runs every 10 minutes guarded by ShedLock to ensure only a single instance executes across clusters.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentReconciliationScheduler {

    private final PaymentReconciliationService reconciliationService;

    @org.springframework.beans.factory.annotation.Value("${app.reconciliation.enabled:true}")
    private boolean enabled = true;

    @Scheduled(cron = "${app.reconciliation.cron:0 */10 * * * *}")
    @SchedulerLock(name = "paymentReconciliationLock", lockAtLeastFor = "PT1M", lockAtMostFor = "PT9M")
    public void runReconciliation() {
        if (!enabled) {
            log.debug("Reconciliation scheduler is disabled by configuration");
            return;
        }
        log.info("ShedLock acquired. Executing scheduled payment reconciliation job...");
        try {
            reconciliationService.reconcileBatch();
        } catch (Exception e) {
            log.error("Error during scheduled payment reconciliation: {}", e.getMessage(), e);
        }
    }
}
