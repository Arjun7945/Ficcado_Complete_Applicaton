package com.aps.ficcado_inventory_sales_management_app.service;

import com.aps.ficcado_inventory_sales_management_app.entity.ActivityLog;
import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Migrated from lib/activityLogger.ts.
 * Writes audit trail entries — one per significant admin action.
 * Uses Propagation.REQUIRES_NEW so a log write never rolls back the parent transaction.
 */
@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    /**
     * Record an activity log entry.
     *
     * @param admin     The admin who performed the action (may be null for system actions)
     * @param action    Short action descriptor, e.g. "CREATE", "UPDATE", "DELETE", "LOGIN"
     * @param module    Module name, e.g. "SALES", "INVENTORY", "REPLACEMENT"
     * @param moduleKey Module key, e.g. "sales", "inventory"
     * @param recordId  The ID or invoice number of the affected record
     * @param message   Human-readable description of what changed
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(Admin admin, String action, String module, String moduleKey,
                    String recordId, String message) {
        ActivityLog entry = ActivityLog.builder()
                .admin(admin)
                .adminName(admin != null ? admin.getAdminName() : "System")
                .action(action)
                .module(module)
                .moduleKey(moduleKey)
                .recordId(recordId)
                .message(message)
                .build();
        activityLogRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public List<ActivityLog> getRecent() {
        return activityLogRepository.findTop100ByOrderByLoggedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<ActivityLog> getAll() {
        return activityLogRepository.findAll();
    }
}
