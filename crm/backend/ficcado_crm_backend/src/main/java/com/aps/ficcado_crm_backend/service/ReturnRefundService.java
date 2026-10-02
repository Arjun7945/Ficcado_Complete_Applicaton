package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.ReturnRefund;
import com.aps.ficcado_crm_backend.entity.ReturnRefundItem;
import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.entity.enums.DamagedProductSource;
import com.aps.ficcado_crm_backend.entity.enums.DispositionOfItems;
import com.aps.ficcado_crm_backend.entity.enums.InventoryTransactionType;
import com.aps.ficcado_crm_backend.entity.enums.ItemVerificationStatus;
import com.aps.ficcado_crm_backend.entity.enums.RefundStatus;
import com.aps.ficcado_crm_backend.entity.enums.SaleStatus;
import com.aps.ficcado_crm_backend.exception.BusinessRuleException;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.repository.ReturnRefundRepository;
import com.aps.ficcado_crm_backend.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Manages the return/refund workflow.
 *
 * Status progression: PENDING → IN_PROGRESS → COMPLETED → CLOSED
 *
 * Close Ticket validation gate:
 * - All returned items must have itemVerificationStatus set (VERIFIED or REJECTED)
 * - Refund amount must be set (sourced from price_charged_returned_items)
 * - Disposition must be set
 *
 * On close:
 * - Returned items: RETURNED_TO_INVENTORY (restock) or SENT_TO_DAMAGED_PRODUCTS
 * - Sales record: unlocked (status → PURCHASE_SATISFIED_AND_ORDER_COMPLETED)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReturnRefundService {

    private final ReturnRefundRepository returnRefundRepository;
    private final ItemRepository itemRepository;
    private final InventoryService inventoryService;
    private final DamagedProductService damagedProductService;
    private final SaleService saleService;
    private final ActivityLogService activityLogService;
    private final SalesLogService salesLogService;
    private final SaleRepository saleRepository;

    @Transactional
    public ReturnRefund create(ReturnRefund returnRefund, Admin performedByAdmin) {
        returnRefund.setRefundStatus(RefundStatus.PENDING);
        ReturnRefund saved = returnRefundRepository.save(returnRefund);

        activityLogService.log(performedByAdmin, "CREATE", "RETURN_REFUND", "return_refund",
                saved.getInvoiceNumber(), "Return/Refund opened for " + saved.getInvoiceNumber());

        return saved;
    }

    @Transactional
    public ReturnRefund updateTicket(Long id, ReturnRefund updatedData, Admin performedByAdmin) {
        ReturnRefund rr = returnRefundRepository.findByIdWithItems(id)
                .orElseThrow(() -> new IllegalArgumentException("Return/Refund not found: " + id));

        if (updatedData.getItemVerificationStatus() != null) {
            rr.setItemVerificationStatus(updatedData.getItemVerificationStatus());
        }
        if (updatedData.getRefundAmount() != null) {
            rr.setRefundAmount(updatedData.getRefundAmount());
        }
        if (updatedData.getTransactionId() != null) {
            rr.setTransactionId(updatedData.getTransactionId().trim());
        }
        if (updatedData.getModeOfRefund() != null) {
            rr.setModeOfRefund(updatedData.getModeOfRefund().trim());
        }
        if (updatedData.getDispositionOfReturnedItems() != null) {
            rr.setDispositionOfReturnedItems(updatedData.getDispositionOfReturnedItems());
        }
        if (updatedData.getRestockDestination() != null) {
            rr.setRestockDestination(updatedData.getRestockDestination().trim());
        }
        if (updatedData.getPriceChargedReturnedItems() != null) {
            rr.setPriceChargedReturnedItems(updatedData.getPriceChargedReturnedItems());
        }
        if (updatedData.getNewDiscountApplied() != null) {
            rr.setNewDiscountApplied(updatedData.getNewDiscountApplied());
        }
        if (updatedData.getReasonForReturn() != null) {
            rr.setReasonForReturn(updatedData.getReasonForReturn().trim());
        }
        if (updatedData.getRefundCompletedDateTime() != null) {
            rr.setRefundCompletedDateTime(updatedData.getRefundCompletedDateTime());
        }
        if (updatedData.getRefundStatus() != null) {
            rr.setRefundStatus(updatedData.getRefundStatus());
        }

        rr.setUpdatedByAdmin(performedByAdmin);
        ReturnRefund saved = returnRefundRepository.save(rr);

        activityLogService.log(performedByAdmin, "UPDATE", "RETURN_REFUND", "return_refund",
                saved.getInvoiceNumber(), "Return/Refund ticket updated for " + saved.getInvoiceNumber());

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
     * Close Ticket — enforces validation gate:
     * - itemVerificationStatus must be set (VERIFIED or REJECTED)
     * - dispositionOfReturnedItems must be set
     * - refundStatus must be COMPLETED before closing
     * - at least one returned item must be recorded
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
        rr.getReturnedItems().forEach(item -> {
            if (item.getItem() == null && item.getItemName() != null && !item.getItemName().isBlank()) {
                itemRepository.findByItemNameIgnoreCase(item.getItemName().trim()).ifPresent(item::setItem);
            }
            Long resolvedItemId = item.getItem() != null ? item.getItem().getId() : null;

            switch (rr.getDispositionOfReturnedItems()) {
                case RETURNED_TO_INVENTORY -> inventoryService.restockInventory(
                        resolvedItemId,
                        item.getSize(), item.getQuantity(),
                        rr.getInvoiceNumber(),
                        InventoryTransactionType.RETURN_REFUND,
                        rr.getRestockDestination(), performedByAdmin);
                case SENT_TO_DAMAGED_PRODUCTS -> damagedProductService.recordFromDisposition(
                        rr.getSale(),
                        resolvedItemId,
                        item.getItemName(), item.getSize(), item.getQuantity(),
                        "From return/refund of " + rr.getInvoiceNumber(),
                        DamagedProductSource.RETURN_REFUND, performedByAdmin);
                case null, default -> {}
            }
        });

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

    @Transactional
    public List<ReturnRefund> getAll() {
        // Auto-heal: Ensure any sales under REFUND_REQUESTED have an active ticket
        List<Sale> refundSales = saleRepository.findAll().stream()
                .filter(s -> s.getSaleStatus() == SaleStatus.REFUND_REQUESTED
                        || "Refund-Requested".equalsIgnoreCase(s.getFulfilmentRequestStatus()))
                .toList();
        for (Sale sale : refundSales) {
            if (returnRefundRepository.findByInvoiceNumber(sale.getInvoiceNumber()).isEmpty()) {
                ReturnRefund rr = ReturnRefund.builder()
                        .sale(sale)
                        .invoiceNumber(sale.getInvoiceNumber())
                        .refundStatus(RefundStatus.PENDING)
                        .build();
                returnRefundRepository.save(rr);
                log.info("Auto-initialized return/refund ticket for invoice [{}] in getAll", sale.getInvoiceNumber());
            }
        }
        return returnRefundRepository.findAllWithItems();
    }

    @Transactional(readOnly = true)
    public Optional<ReturnRefund> findById(Long id) {
        return returnRefundRepository.findByIdWithItems(id);
    }

    @Transactional
    public Optional<ReturnRefund> findByInvoiceNumber(String invoiceNumber) {
        Optional<ReturnRefund> existing = returnRefundRepository.findByInvoiceNumberWithItems(invoiceNumber);
        if (existing.isPresent()) {
            return existing;
        }
        return saleRepository.findByInvoiceNumber(invoiceNumber)
                .filter(sale -> sale.getSaleStatus() == SaleStatus.REFUND_REQUESTED
                        || "Refund-Requested".equalsIgnoreCase(sale.getFulfilmentRequestStatus()))
                .map(sale -> {
                    ReturnRefund rr = ReturnRefund.builder()
                            .sale(sale)
                            .invoiceNumber(sale.getInvoiceNumber())
                            .refundStatus(RefundStatus.PENDING)
                            .build();
                    ReturnRefund saved = returnRefundRepository.save(rr);
                    log.info("Auto-initialized missing return/refund ticket for invoice [{}]", invoiceNumber);
                    return saved;
                });
    }

    private ReturnRefund findByIdOrThrow(Long id) {
        return returnRefundRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Return/Refund not found: " + id));
    }
}
