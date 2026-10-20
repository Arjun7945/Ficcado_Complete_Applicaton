package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.repository.ActivityLogRepository;
import com.aps.ficcado_crm_backend.repository.SalesLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Scheduled cleanup task for bounded log storage in PostgreSQL (BE-014).
 * Purges activity logs and sales logs older than retentionDays (default 180 days).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LogRetentionService {

    private final ActivityLogRepository activityLogRepository;
    private final SalesLogRepository salesLogRepository;

    @Value("${app.logs.retention-days:180}")
    private int retentionDays;

    @Scheduled(cron = "${app.logs.cleanup-cron:0 0 3 * * *}") // Daily at 3:00 AM
    @Transactional
    public void purgeExpiredLogs() {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        log.info("Starting log retention purge for records older than {} days (cutoff: {})", retentionDays, cutoff);

        int activityLogsPurged = activityLogRepository.deleteByLoggedAtBefore(cutoff);
        int salesLogsPurged = salesLogRepository.deleteByCreatedAtBefore(cutoff);

        if (activityLogsPurged > 0 || salesLogsPurged > 0) {
            log.info("Log retention purge completed: {} activity logs and {} sales logs removed.",
                    activityLogsPurged, salesLogsPurged);
        } else {
            log.debug("Log retention purge completed: no expired logs found.");
        }
    }
}
