package com.aps.ficcado_inventory_sales_management_app.service;

import com.aps.ficcado_inventory_sales_management_app.entity.*;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.*;
import com.aps.ficcado_inventory_sales_management_app.exception.BusinessRuleException;
import com.aps.ficcado_inventory_sales_management_app.repository.ReturnRefundRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Manages the return/refund workflow.
 * Migrated from app/api/return-refund/ route handlers.
 *
 * Status progression: PENDING → IN_PROGRESS → COMPLETED → CLOSED
 *
 * Close Ticket validation gate (from Part 5):
 * - All returned items must have itemVerificationStatus set (VERIFIED or REJECTED)
 * - Refund amount must be set (sourced from price_charged_returned_items)
 * - Disposition must be set
 *
 * On close:
 * - Returned items: RETURNED_TO_INVENTORY (restock) or SENT_TO_DAMAGED_PRODUCTS
 * - Sales record: unlocked (status → PURCHASE_SATISFIED_AND_ORDER_COMPLETED)
 *
 * Note: "New Final Items" are NOT stored — derived as original sale_line_items
 * minus return_refund_items (avoids drift, per Section 1.1).
 */
@Service
@RequiredArgsConstructor
public class ReturnRefundService {

    private final ReturnRefundRepository returnRefundRepository;
    private final InventoryService inventoryService;
    private final DamagedProductService damagedProductService;
    private final SaleService saleService;
    private final ActivityLogService activityLogService;
    private final SalesLogService salesLogService;

    @Transactional
    public ReturnRefund create(ReturnRefund returnRefund, Admin performedByAdmin) {
        returnRefund.setRefundStatus(RefundStatus.PENDING);
        ReturnRefund saved = returnRefundRepository.save(returnRefund);

        activityLogService.log(performedByAdmin, "CREATE", "RETURN_REFUND", "return_refund",
                saved.getInvoiceNumber(), "Return/Refund opened for " + saved.getInvoiceNumber());

        return saved;
    }

    @Transactional
    public ReturnRefund saveProgress(Long id, RefundStatus newStatus, Admin performedByAdmin) {
        ReturnRefund rr = findByIdOrThrow(id);
        rr.setRefundStatus(newStatus);
        ReturnRefund saved = returnRefundRepository.save(rr);

        activityLogService.log(performedByAdmin, "UPDATE", "RETURN_REFUND", "return_refund",
                saved.getInvoiceNumber(),
                "Return/Refund " + saved.getInvoiceNumber() + " status → " + newStatus.name());

        return saved;
    }

    /**
     * Close Ticket — enforces Part 5's all-items-specific validation gate:
     * - itemVerificationStatus must be set (VERIFIED or REJECTED)
     * - refundAmount must be > 0 (sourced from priceChargedReturnedItems)
     * - dispositionOfReturnedItems must be set
     * - refundStatus must be COMPLETED before closing
     */
    @Transactional
    public ReturnRefund closeTicket(Long id, Admin performedByAdmin) {
        ReturnRefund rr = returnRefundRepository.findByIdWithItems(id)
                .orElseThrow(() -> new IllegalArgumentException("Return/Refund not found: " + id));

        // Validation gate
        if (rr.getItemVerificationStatus() == null
                || rr.getItemVerificationStatus() == ItemVerificationStatus.PENDING) {
            throw new BusinessRuleException(
                    "Cannot close ticket: item verification status must be set (VERIFIED or REJECTED).");
        }
        if (rr.getDispositionOfReturnedItems() == null) {
            throw new BusinessRuleException(
                    "Cannot close ticket: disposition of returned items must be set.");
        }
        if (rr.getRefundStatus() != RefundStatus.COMPLETED) {
            throw new BusinessRuleException(
                    "Cannot close ticket: refund must be marked COMPLETED first.");
        }
        if (rr.getReturnedItems().isEmpty()) {
            throw new BusinessRuleException(
                    "Cannot close ticket: at least one returned item must be recorded.");
        }

        // Handle item disposition
        for (ReturnRefundItem item : rr.getReturnedItems()) {
            if (rr.getDispositionOfReturnedItems() == DispositionOfItems.RETURNED_TO_INVENTORY) {
                inventoryService.restockInventory(
                        item.getItem() != null ? item.getItem().getId() : null,
                        item.getSize(), item.getQuantity(),
                        rr.getInvoiceNumber(),
                        InventoryTransactionType.RETURN_REFUND,
                        rr.getRestockDestination(), performedByAdmin);
            } else if (rr.getDispositionOfReturnedItems() == DispositionOfItems.SENT_TO_DAMAGED_PRODUCTS) {
                damagedProductService.recordFromDisposition(
                        rr.getSale(),
                        item.getItem() != null ? item.getItem().getId() : null,
                        item.getItemName(), item.getSize(), item.getQuantity(),
                        "From return/refund of " + rr.getInvoiceNumber(),
                        DamagedProductSource.RETURN_REFUND, performedByAdmin);
            }
        }

        // Close ticket
        rr.setRefundStatus(RefundStatus.CLOSED);
        rr.setClosedByAdmin(performedByAdmin);
        if (rr.getRefundCompletedDateTime() == null) {
            rr.setRefundCompletedDateTime(Instant.now());
        }
        ReturnRefund saved = returnRefundRepository.save(rr);

        // Unlock sale
        saleService.unlockSale(rr.getSale().getId(), performedByAdmin);

        // Logs
        String dispositionLabel = rr.getDispositionOfReturnedItems().name()
                .replace("_", " ").toLowerCase();
        String refundAmt = rr.getPriceChargedReturnedItems() != null
                ? rr.getPriceChargedReturnedItems().toPlainString() : "0";

        activityLogService.log(performedByAdmin, "CLOSE_TICKET", "RETURN_REFUND", "return_refund",
                saved.getInvoiceNumber(), "Return/Refund ticket closed for " + saved.getInvoiceNumber());

        salesLogService.log(performedByAdmin, "Return/Refund", "CLOSE_TICKET", saved.getInvoiceNumber(),
                salesLogService.refundClosedMessage(
                        saved.getInvoiceNumber(), performedByAdmin.getAdminName(),
                        refundAmt, dispositionLabel));

        return saved;
    }

    @Transactional(readOnly = true)
    public List<ReturnRefund> getAll() {
        return returnRefundRepository.findAllWithItems();
    }

    @Transactional(readOnly = true)
    public Optional<ReturnRefund> findById(Long id) {
        return returnRefundRepository.findByIdWithItems(id);
    }

    private ReturnRefund findByIdOrThrow(Long id) {
        return returnRefundRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Return/Refund not found: " + id));
    }
}
