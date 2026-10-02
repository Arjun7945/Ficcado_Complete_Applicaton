package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.SalesLog;
import com.aps.ficcado_crm_backend.repository.SalesLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Migrated from lib/salesLogger.ts.
 * Generates and persists narrative audit log messages for every sale lifecycle event.
 * Message format is kept identical to the existing app to preserve historical log consistency.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SalesLogService {

    private final SalesLogRepository salesLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(Admin admin, String module, String operation,
                    String invoiceNumber, String message) {
        log.debug("Sales log [{} - {}]: invoice={} message='{}' (admin={})",
                module, operation, invoiceNumber, message, admin != null ? admin.getAdminName() : "System");
        SalesLog entry = SalesLog.builder()
                .module(module)
                .operation(operation)
                .relatedInvoiceNumber(invoiceNumber)
                .logMessage(message)
                .admin(admin)
                .adminName(admin != null ? admin.getAdminName() : "System")
                .build();
        salesLogRepository.save(entry);
    }


    // ── Narrative message generators (matching the lib/salesLogger.ts format) ──

    public String saleCreatedMessage(String invoiceNumber, String customerName,
                                     String adminName, String totalAmount) {
        return String.format(
                "New sale %s created for customer %s by %s. Total: ₹%s.",
                invoiceNumber, customerName, adminName, totalAmount);
    }

    public String saleUpdatedMessage(String invoiceNumber, String adminName) {
        return String.format("Sale %s updated by %s.", invoiceNumber, adminName);
    }

    public String replaceRequestedMessage(String invoiceNumber, String adminName) {
        return String.format(
                "Replacement requested for sale %s by %s. Sale locked pending replacement.",
                invoiceNumber, adminName);
    }

    public String refundRequestedMessage(String invoiceNumber, String adminName) {
        return String.format(
                "Return/Refund requested for sale %s by %s. Sale locked pending resolution.",
                invoiceNumber, adminName);
    }

    public String replacementCompletedMessage(String invoiceNumber, String adminName, String disposition) {
        return String.format(
                "Replacement for sale %s completed by %s. Old items: %s. Sale unlocked.",
                invoiceNumber, adminName, disposition);
    }

    public String refundClosedMessage(String invoiceNumber, String adminName,
                                      String refundAmount, String disposition) {
        return String.format(
                "Return/Refund ticket for sale %s closed by %s. Refund: ₹%s. Items: %s. Sale unlocked.",
                invoiceNumber, adminName, refundAmount, disposition);
    }

    @Transactional(readOnly = true)
    public List<SalesLog> getByInvoice(String invoiceNumber) {
        return salesLogRepository.findByRelatedInvoiceNumberOrderByCreatedAtDesc(invoiceNumber);
    }

    @Transactional(readOnly = true)
    public List<SalesLog> getRecent() {
        return salesLogRepository.findTop100ByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<SalesLog> getAll() {
        return salesLogRepository.findAll();
    }
}
