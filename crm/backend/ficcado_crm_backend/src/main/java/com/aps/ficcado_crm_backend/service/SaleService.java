package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Customer;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.entity.SaleLineItem;
import com.aps.ficcado_crm_backend.entity.enums.DeliveryStatus;
import com.aps.ficcado_crm_backend.entity.enums.FulfilmentSource;
import com.aps.ficcado_crm_backend.entity.enums.InventoryTransactionType;
import com.aps.ficcado_crm_backend.entity.enums.PaymentStatus;
import com.aps.ficcado_crm_backend.entity.enums.SaleStatus;
import com.aps.ficcado_crm_backend.entity.Replacement;
import com.aps.ficcado_crm_backend.entity.ReturnRefund;
import com.aps.ficcado_crm_backend.entity.enums.RefundStatus;
import com.aps.ficcado_crm_backend.entity.enums.ReplacementStatus;
import com.aps.ficcado_crm_backend.exception.SaleLockedException;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.repository.ReplacementRepository;
import com.aps.ficcado_crm_backend.repository.ReturnRefundRepository;
import com.aps.ficcado_crm_backend.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Core sale lifecycle service.
 * Migrated from app/api/sales/route.ts, app/api/sales/[id]/route.ts,
 * and lib/salesPricing.ts.
 *
 * Manages:
 * - Sale creation with inventory/warehouse deduction
 * - Customer upsert on every new sale
 * - Sale status progression
 * - Replace/Refund request locking
 * - Sale unlock on replacement/return completion
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository saleRepository;
    private final ItemRepository itemRepository;
    private final InventoryService inventoryService;
    private final CustomerService customerService;
    private final ActivityLogService activityLogService;
    private final SalesLogService salesLogService;
    private final ReviewService reviewService;
    private final ReplacementRepository replacementRepository;
    private final ReturnRefundRepository returnRefundRepository;


    // ── Creation ──────────────────────────────────────────────────────────────

    @Transactional
    public Sale createSale(Sale sale, Admin performedByAdmin) {
        log.info("Creating sale [invoice={}] by admin [id={}, name={}]",
                sale.getInvoiceNumber(),
                performedByAdmin != null ? performedByAdmin.getId() : "system",
                performedByAdmin != null ? performedByAdmin.getAdminName() : "system");
        // Validate sale is not locked (shouldn't be on creation, but defensive check)
        if (isSaleLocked(sale)) {
            throw new SaleLockedException("Cannot modify a locked sale.");
        }

        // Ensure every line item has its Item entity resolved
        if (sale.getLineItems() != null) {
            sale.getLineItems().forEach(lineItem -> {
                if (lineItem.getItem() == null && lineItem.getItemName() != null && !lineItem.getItemName().isBlank()) {
                    itemRepository.findByItemNameIgnoreCase(lineItem.getItemName().trim()).ifPresent(lineItem::setItem);
                }
                if (lineItem.getItem() == null) {
                    throw new IllegalStateException("Item '%s' not found in catalog. Cannot process sale."
                            .formatted(lineItem.getItemName()));
                }
            });
        }

        // Deduct inventory based on fulfilment source
        switch (sale.getFulfilmentSource()) {
            case TAKE_FROM_INVENTORY -> sale.getLineItems().forEach(lineItem ->
                    inventoryService.deductFromInventory(
                            lineItem.getItem().getId(),
                            lineItem.getSize(),
                            lineItem.getQuantity(),
                            sale.getInvoiceNumber(),
                            InventoryTransactionType.SALE.name(),
                            performedByAdmin));
            case WAREHOUSE_HANDLER -> {
                if (sale.getSaleClosedByAdmin() != null) {
                    sale.getLineItems().forEach(lineItem ->
                            inventoryService.deductFromWarehouse(
                                    sale.getSaleClosedByAdmin().getId(),
                                    lineItem.getItem().getId(),
                                    lineItem.getSize(),
                                    lineItem.getQuantity(),
                                    sale.getInvoiceNumber(),
                                    InventoryTransactionType.SALE.name(),
                                    performedByAdmin));
                }
            }
            case null, default -> {}
        }

        // Upsert customer record
        if (sale.getCustomerPhoneNumber() != null && !sale.getCustomerPhoneNumber().isBlank()) {
            Customer customer = customerService.upsertOnSaleCreation(
                    sale.getCustomerPhoneNumber(),
                    sale.getCustomerName(),
                    sale.getCustomerEmail(),
                    sale.getCustomerAddress(),
                    performedByAdmin);
            sale.setCustomer(customer);
        }

        if (sale.getSaleStatus() == SaleStatus.PURCHASE_SATISFIED_AND_ORDER_COMPLETED
                || sale.getSaleStatus() == SaleStatus.COMPLETED) {
            if (sale.getSaleClosedByAdmin() == null) {
                sale.setSaleClosedByAdmin(performedByAdmin);
            }
            sale.setFulfilmentRequestStatus("Completed");
        } else if (sale.getFulfilmentRequestStatus() == null || sale.getFulfilmentRequestStatus().isBlank()) {
            sale.setFulfilmentRequestStatus("Normal");
        }
        if (sale.getFulfilmentSource() == null) {
            sale.setFulfilmentSource(FulfilmentSource.TAKE_FROM_INVENTORY);
        }
        if (sale.getModeOfPayment() == null || sale.getModeOfPayment().isBlank() || "N/A".equalsIgnoreCase(sale.getModeOfPayment().trim())) {
            sale.setModeOfPayment("Not_Selected_Yet");
        }
        if (sale.getTransactionId() == null || sale.getTransactionId().isBlank() || "N/A".equalsIgnoreCase(sale.getTransactionId().trim())) {
            sale.setTransactionId("No_transaction_id_Collected_Yet");
        }
        if (sale.getReceivedBy() == null || sale.getReceivedBy().isBlank() || "N/A".equalsIgnoreCase(sale.getReceivedBy().trim())) {
            sale.setReceivedBy("Not_Received_Yet");
        }
        if (sale.getRemarks() == null || sale.getRemarks().isBlank() || "N/A".equalsIgnoreCase(sale.getRemarks().trim())) {
            sale.setRemarks("No_Remarks");
        }
        if (sale.getCustomerAddress() == null || sale.getCustomerAddress().isBlank() || "N/A".equalsIgnoreCase(sale.getCustomerAddress().trim())) {
            sale.setCustomerAddress("Address_Not_Provided_Yet");
        }
        if (sale.getCustomerEmail() == null || sale.getCustomerEmail().isBlank() || "N/A".equalsIgnoreCase(sale.getCustomerEmail().trim())) {
            sale.setCustomerEmail("No_Email_Provided");
        }

        Sale saved = saleRepository.save(sale);
        checkAndTriggerReviewTokens(saved);

        log.info("Sale created successfully [invoice={}, customer={}, total={}]",
                saved.getInvoiceNumber(), saved.getCustomerName(),
                saved.getTotalAmount());

        // Log
        activityLogService.log(performedByAdmin, "CREATE", "SALES", "sales",
                saved.getInvoiceNumber(), "Sale created: " + saved.getInvoiceNumber());
        salesLogService.log(performedByAdmin, "Sales", "CREATE", saved.getInvoiceNumber(),
                salesLogService.saleCreatedMessage(
                        saved.getInvoiceNumber(), saved.getCustomerName(),
                        performedByAdmin.getAdminName(),
                        saved.getTotalAmount().toPlainString()));

        return saved;
    }

    // ── Update ────────────────────────────────────────────────────────────────

    @Transactional
    public Sale updateSale(Sale sale, Admin performedByAdmin) {
        return updateSale(sale.getId(), sale, performedByAdmin);
    }

    @Transactional
    public Sale updateSale(Long saleId, Sale incoming, Admin performedByAdmin) {
        log.info("Updating sale [id={}] by admin [id={}]", saleId,
                performedByAdmin != null ? performedByAdmin.getId() : "system");
        Sale existing = saleRepository.findById(saleId)
                .orElseThrow(() -> new IllegalArgumentException("Sale not found: " + saleId));

        if (isSaleLocked(existing)) {
            throw new SaleLockedException(
                    "Sale " + existing.getInvoiceNumber() + " is locked — resolve the pending "
                    + existing.getSaleStatus().name().toLowerCase().replace("_", " ") + " first.");
        }

        if (incoming.getCustomerName() != null && !incoming.getCustomerName().isBlank()) {
            existing.setCustomerName(incoming.getCustomerName().trim());
        }
        if (incoming.getCustomerPhoneNumber() != null && !incoming.getCustomerPhoneNumber().isBlank()) {
            existing.setCustomerPhoneNumber(incoming.getCustomerPhoneNumber().trim());
        }
        if (incoming.getCustomerAddress() != null) {
            existing.setCustomerAddress(incoming.getCustomerAddress().trim());
        }
        if (incoming.getCustomerEmail() != null) {
            existing.setCustomerEmail(incoming.getCustomerEmail().trim());
        }
        if (incoming.getSaleStatus() != null) {
            existing.setSaleStatus(incoming.getSaleStatus());
            if (incoming.getSaleStatus() == SaleStatus.PURCHASE_SATISFIED_AND_ORDER_COMPLETED
                    || incoming.getSaleStatus() == SaleStatus.COMPLETED) {
                if (incoming.getSaleClosedByAdmin() != null) {
                    existing.setSaleClosedByAdmin(incoming.getSaleClosedByAdmin());
                } else if (existing.getSaleClosedByAdmin() == null) {
                    existing.setSaleClosedByAdmin(performedByAdmin);
                }
                existing.setFulfilmentRequestStatus("Completed");
            }
        }
        if (incoming.getPaymentStatus() != null) {
            existing.setPaymentStatus(incoming.getPaymentStatus());
        }
        if (incoming.getModeOfPayment() != null) {
            existing.setModeOfPayment(incoming.getModeOfPayment());
        }
        if (incoming.getTransactionId() != null) {
            existing.setTransactionId(incoming.getTransactionId());
        }
        if (incoming.getDeliveryStatus() != null) {
            existing.setDeliveryStatus(incoming.getDeliveryStatus());
        }
        if (incoming.getDeliveryChargeEnabled() != null) {
            existing.setDeliveryChargeEnabled(incoming.getDeliveryChargeEnabled());
        }
        if (incoming.getDeliveryChargeAmount() != null) {
            existing.setDeliveryChargeAmount(incoming.getDeliveryChargeAmount());
        }
        if (incoming.getFulfilmentSource() != null) {
            existing.setFulfilmentSource(incoming.getFulfilmentSource());
        }
        if (incoming.getDiscount() != null) {
            existing.setDiscount(incoming.getDiscount());
        }
        if (incoming.getTotalAmount() != null && incoming.getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
            existing.setTotalAmount(incoming.getTotalAmount());
        }
        if (incoming.getReceivedBy() != null) {
            existing.setReceivedBy(incoming.getReceivedBy());
        }
        if (incoming.getRemarks() != null) {
            existing.setRemarks(incoming.getRemarks());
        }
        if (incoming.getSaleClosedByAdmin() != null) {
            existing.setSaleClosedByAdmin(incoming.getSaleClosedByAdmin());
        } else if ((existing.getSaleStatus() == SaleStatus.PURCHASE_SATISFIED_AND_ORDER_COMPLETED
                || existing.getSaleStatus() == SaleStatus.COMPLETED)
                && existing.getSaleClosedByAdmin() == null) {
            existing.setSaleClosedByAdmin(performedByAdmin);
        }

        // Only replace line items if incoming provides a non-empty list
        if (incoming.getLineItems() != null && !incoming.getLineItems().isEmpty()) {
            existing.getLineItems().clear();
            incoming.getLineItems().forEach(li -> {
                li.setSale(existing);
                existing.getLineItems().add(li);
            });
        }

        existing.setUpdatedByAdmin(performedByAdmin);
        Sale saved = saleRepository.save(existing);
        checkAndTriggerReviewTokens(saved);

        activityLogService.log(performedByAdmin, "UPDATE", "SALES", "sales",
                saved.getInvoiceNumber(), "Sale updated: " + saved.getInvoiceNumber());
        salesLogService.log(performedByAdmin, "Sales", "UPDATE", saved.getInvoiceNumber(),
                salesLogService.saleUpdatedMessage(saved.getInvoiceNumber(), performedByAdmin.getAdminName()));

        return saved;
    }

    @Transactional
    public Sale addItemsToSale(Long saleId, List<SaleLineItem> itemsToAdd, Admin performedByAdmin) {
        Sale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new IllegalArgumentException("Sale not found: " + saleId));

        if (isSaleLocked(sale)) {
            throw new SaleLockedException("Cannot modify a locked sale.");
        }

        if (itemsToAdd == null || itemsToAdd.isEmpty()) {
            return sale;
        }

        BigDecimal additionalTotal = itemsToAdd.stream()
                .map(lineItem -> {
                    if (lineItem.getItem() == null && lineItem.getItemName() != null && !lineItem.getItemName().isBlank()) {
                        itemRepository.findByItemNameIgnoreCase(lineItem.getItemName().trim()).ifPresent(lineItem::setItem);
                    }
                    if (lineItem.getItem() == null) {
                        throw new IllegalStateException("Item '%s' not found in catalog. Cannot add to sale."
                                .formatted(lineItem.getItemName()));
                    }

                    // Deduct stock based on fulfilment source
                    switch (sale.getFulfilmentSource()) {
                        case TAKE_FROM_INVENTORY -> inventoryService.deductFromInventory(
                                lineItem.getItem().getId(),
                                lineItem.getSize(),
                                lineItem.getQuantity(),
                                sale.getInvoiceNumber(),
                                InventoryTransactionType.SALE.name(),
                                performedByAdmin);
                        case WAREHOUSE_HANDLER -> {
                            if (sale.getSaleClosedByAdmin() != null) {
                                inventoryService.deductFromWarehouse(
                                        sale.getSaleClosedByAdmin().getId(),
                                        lineItem.getItem().getId(),
                                        lineItem.getSize(),
                                        lineItem.getQuantity(),
                                        sale.getInvoiceNumber(),
                                        InventoryTransactionType.SALE.name(),
                                        performedByAdmin);
                            }
                        }
                        case null, default -> {}
                    }

                    lineItem.setSale(sale);
                    sale.getLineItems().add(lineItem);
                    return lineItem.getTotalPrice() != null ? lineItem.getTotalPrice() : BigDecimal.ZERO;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        sale.setTotalAmount(sale.getTotalAmount() != null ? sale.getTotalAmount().add(additionalTotal) : additionalTotal);
        sale.setUpdatedByAdmin(performedByAdmin);

        Sale saved = saleRepository.save(sale);

        activityLogService.log(performedByAdmin, "UPDATE", "SALES", "sales",
                saved.getInvoiceNumber(), "Added " + itemsToAdd.size() + " item(s) to sale: " + saved.getInvoiceNumber());
        salesLogService.log(performedByAdmin, "Sales", "UPDATE", saved.getInvoiceNumber(),
                "Added " + itemsToAdd.size() + " item(s) to invoice " + saved.getInvoiceNumber() + " by " + performedByAdmin.getAdminName());

        return saved;
    }

    // ── Replace / Refund request (lock) ──────────────────────────────────────

    @Transactional
    public Sale requestReplacement(Long saleId, Admin performedByAdmin) {
        log.info("Replacement requested on sale [id={}] by admin [id={}]", saleId,
                performedByAdmin != null ? performedByAdmin.getId() : "system");
        Sale sale = findByIdOrThrow(saleId);
        sale.setSaleStatus(SaleStatus.REPLACE_REQUESTED);
        sale.setFulfilmentRequestStatus("Replace-Requested");
        sale.setUpdatedByAdmin(performedByAdmin);
        Sale saved = saleRepository.save(sale);

        // Auto-initialize replacement ticket if it does not exist yet
        if (replacementRepository.findByInvoiceNumber(saved.getInvoiceNumber()).isEmpty()) {
            Replacement rep = Replacement.builder()
                    .sale(saved)
                    .invoiceNumber(saved.getInvoiceNumber())
                    .invoiceStatus(ReplacementStatus.APPROVED)
                    .createdByAdmin(performedByAdmin)
                    .updatedByAdmin(performedByAdmin)
                    .build();
            replacementRepository.save(rep);
            log.info("Initialized replacement ticket for invoice [{}]", saved.getInvoiceNumber());
        }

        activityLogService.log(performedByAdmin, "REPLACE_REQUEST", "SALES", "sales",
                saved.getInvoiceNumber(), "Replace requested on: " + saved.getInvoiceNumber());
        salesLogService.log(performedByAdmin, "Sales", "REPLACE_REQUEST", saved.getInvoiceNumber(),
                salesLogService.replaceRequestedMessage(saved.getInvoiceNumber(), performedByAdmin.getAdminName()));

        return saved;
    }

    @Transactional
    public Sale requestRefund(Long saleId, Admin performedByAdmin) {
        log.info("Refund requested on sale [id={}] by admin [id={}]", saleId,
                performedByAdmin != null ? performedByAdmin.getId() : "system");
        Sale sale = findByIdOrThrow(saleId);
        sale.setSaleStatus(SaleStatus.REFUND_REQUESTED);
        sale.setFulfilmentRequestStatus("Refund-Requested");
        sale.setUpdatedByAdmin(performedByAdmin);
        Sale saved = saleRepository.save(sale);

        // Auto-initialize return/refund ticket if it does not exist yet
        if (returnRefundRepository.findByInvoiceNumber(saved.getInvoiceNumber()).isEmpty()) {
            ReturnRefund rr = ReturnRefund.builder()
                    .sale(saved)
                    .invoiceNumber(saved.getInvoiceNumber())
                    .refundStatus(RefundStatus.PENDING)
                    .createdByAdmin(performedByAdmin)
                    .updatedByAdmin(performedByAdmin)
                    .build();
            returnRefundRepository.save(rr);
            log.info("Initialized return/refund ticket for invoice [{}]", saved.getInvoiceNumber());
        }

        activityLogService.log(performedByAdmin, "REFUND_REQUEST", "SALES", "sales",
                saved.getInvoiceNumber(), "Refund requested on: " + saved.getInvoiceNumber());
        salesLogService.log(performedByAdmin, "Sales", "REFUND_REQUEST", saved.getInvoiceNumber(),
                salesLogService.refundRequestedMessage(saved.getInvoiceNumber(), performedByAdmin.getAdminName()));

        return saved;
    }

    /**
     * Dedicated method to mark a sale as completed/satisfied and record closed-by admin.
     */
    @Transactional
    public Sale markSaleCompleted(Long saleId, String paymentStatus, String modeOfPayment,
                                  String transactionId, String deliveryStatus,
                                  String receivedBy, String remarks, Admin performedByAdmin) {
        log.info("Marking sale [id={}] as completed by admin [id={}]", saleId,
                performedByAdmin != null ? performedByAdmin.getId() : "system");
        Sale sale = findByIdOrThrow(saleId);

        if (isSaleLocked(sale)) {
            throw new SaleLockedException(
                    "Sale " + sale.getInvoiceNumber() + " is locked under "
                    + sale.getSaleStatus().name() + " and cannot be completed directly.");
        }

        sale.setSaleStatus(SaleStatus.PURCHASE_SATISFIED_AND_ORDER_COMPLETED);
        sale.setFulfilmentRequestStatus("Completed");

        if (deliveryStatus != null && !deliveryStatus.isBlank()) {
            sale.setDeliveryStatus(DeliveryStatus.fromString(deliveryStatus));
        } else {
            sale.setDeliveryStatus(DeliveryStatus.DELIVERED);
        }

        if (paymentStatus != null && !paymentStatus.isBlank()) {
            sale.setPaymentStatus(PaymentStatus.fromString(paymentStatus));
        } else {
            sale.setPaymentStatus(PaymentStatus.PAID);
        }

        if (modeOfPayment != null && !modeOfPayment.isBlank() && !"N/A".equalsIgnoreCase(modeOfPayment.trim())) {
            sale.setModeOfPayment(modeOfPayment.trim());
        } else if (sale.getModeOfPayment() == null || "Not_Selected_Yet".equalsIgnoreCase(sale.getModeOfPayment()) || "N/A".equalsIgnoreCase(sale.getModeOfPayment())) {
            sale.setModeOfPayment("Cash");
        }

        if (transactionId != null && !transactionId.isBlank() && !"N/A".equalsIgnoreCase(transactionId.trim())) {
            sale.setTransactionId(transactionId.trim());
        }

        if (receivedBy != null && !receivedBy.isBlank() && !"N/A".equalsIgnoreCase(receivedBy.trim())) {
            sale.setReceivedBy(receivedBy.trim());
        }

        if (remarks != null && !remarks.isBlank() && !"No_Remarks".equalsIgnoreCase(remarks.trim())) {
            sale.setRemarks(remarks.trim());
        }

        sale.setSaleClosedByAdmin(performedByAdmin);
        sale.setUpdatedByAdmin(performedByAdmin);

        Sale saved = saleRepository.save(sale);
        checkAndTriggerReviewTokens(saved);

        activityLogService.log(performedByAdmin, "COMPLETE", "SALES", "sales",
                saved.getInvoiceNumber(), "Sale marked completed & closed by admin: " + performedByAdmin.getAdminName());
        salesLogService.log(performedByAdmin, "Sales", "COMPLETE", saved.getInvoiceNumber(),
                "Sale " + saved.getInvoiceNumber() + " marked completed and closed by " + performedByAdmin.getAdminName());

        return saved;
    }

    /**
     * Unlock sale after replacement or return/refund is completed.
     * Sets status to PURCHASE_SATISFIED_AND_ORDER_COMPLETED and fulfilmentRequestStatus to Completed.
     */
    @Transactional
    public Sale unlockSale(Long saleId, Admin performedByAdmin) {
        log.info("Unlocking sale [id={}] by admin [id={}]", saleId,
                performedByAdmin != null ? performedByAdmin.getId() : "system");
        Sale sale = findByIdOrThrow(saleId);
        sale.setSaleStatus(SaleStatus.PURCHASE_SATISFIED_AND_ORDER_COMPLETED);
        sale.setFulfilmentRequestStatus("Completed");
        sale.setSaleClosedByAdmin(performedByAdmin);
        sale.setUpdatedByAdmin(performedByAdmin);
        Sale saved = saleRepository.save(sale);
        log.info("Sale [invoice={}] unlocked successfully", saved.getInvoiceNumber());
        return saved;
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Sale> getAll() {
        // Use JOIN FETCH to load line items in one query — prevents N+1
        return saleRepository.findAllWithLineItems();
    }

    /**
     * Keyset pagination for scalable sales listing (BE-005).
     */
    @Transactional(readOnly = true)
    public List<Sale> getPageBefore(Long lastSeenId, int pageSize) {
        Pageable pageable = PageRequest.of(0, pageSize);
        return saleRepository.findPageBeforeId(lastSeenId, pageable);
    }

    @Transactional(readOnly = true)
    public Optional<Sale> findById(Long id) {
        return saleRepository.findByIdWithLineItems(id)
                .or(() -> saleRepository.findById(id));
    }

    @Transactional(readOnly = true)
    public Optional<Sale> findByInvoiceNumber(String invoiceNumber) {
        return saleRepository.findByInvoiceNumberWithLineItems(invoiceNumber)
                .or(() -> saleRepository.findByInvoiceNumber(invoiceNumber));
    }

    @Transactional(readOnly = true)
    public List<Sale> search(String query) {
        return saleRepository.searchSales(query);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Sale findByIdOrThrow(Long id) {
        return saleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sale not found: " + id));
    }

    public boolean isSaleLocked(Sale sale) {
        if (sale == null || sale.getSaleStatus() == null) return false;
        return sale.getSaleStatus() == SaleStatus.REPLACE_REQUESTED
                || sale.getSaleStatus() == SaleStatus.REFUND_REQUESTED;
    }

    private void checkAndTriggerReviewTokens(Sale sale) {
        if (sale == null || sale.getLineItems() == null) return;
        if (sale.getDeliveryStatus() == DeliveryStatus.DELIVERED) {
            sale.getLineItems().stream()
                    .filter(lineItem -> lineItem.getItem() != null)
                    .forEach(lineItem -> {
                        try {
                            reviewService.generateReviewToken(lineItem, sale.getCustomer());
                        } catch (RuntimeException e) {
                            log.warn("Failed to generate review token for line item [id={}] on sale [{}]: {}",
                                    lineItem.getId(), sale.getInvoiceNumber(), e.getMessage(), e);
                        }
                    });
        }
    }
}

