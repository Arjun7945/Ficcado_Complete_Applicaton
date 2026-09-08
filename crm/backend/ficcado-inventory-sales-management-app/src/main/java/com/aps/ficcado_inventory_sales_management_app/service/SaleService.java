package com.aps.ficcado_inventory_sales_management_app.service;

import com.aps.ficcado_inventory_sales_management_app.entity.*;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.*;
import com.aps.ficcado_inventory_sales_management_app.exception.SaleLockedException;
import com.aps.ficcado_inventory_sales_management_app.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository saleRepository;
    private final InventoryService inventoryService;
    private final CustomerService customerService;
    private final ActivityLogService activityLogService;
    private final SalesLogService salesLogService;
    private final ReviewService reviewService;


    // ── Creation ──────────────────────────────────────────────────────────────

    @Transactional
    public Sale createSale(Sale sale, Admin performedByAdmin) {
        // Validate sale is not locked (shouldn't be on creation, but defensive check)
        if (isSaleLocked(sale)) {
            throw new SaleLockedException("Cannot modify a locked sale.");
        }

        // Deduct inventory based on fulfilment source
        if (sale.getFulfilmentSource() == FulfilmentSource.TAKE_FROM_INVENTORY) {
            for (SaleLineItem lineItem : sale.getLineItems()) {
                inventoryService.deductFromInventory(
                        lineItem.getItem() != null ? lineItem.getItem().getId() : null,
                        lineItem.getSize(),
                        lineItem.getQuantity(),
                        sale.getInvoiceNumber(),
                        InventoryTransactionType.SALE.name(),
                        performedByAdmin);
            }
        } else if (sale.getFulfilmentSource() == FulfilmentSource.WAREHOUSE_HANDLER
                && sale.getSaleClosedByAdmin() != null) {
            for (SaleLineItem lineItem : sale.getLineItems()) {
                inventoryService.deductFromWarehouse(
                        sale.getSaleClosedByAdmin().getId(),
                        lineItem.getItem() != null ? lineItem.getItem().getId() : null,
                        lineItem.getSize(),
                        lineItem.getQuantity(),
                        sale.getInvoiceNumber(),
                        InventoryTransactionType.SALE.name(),
                        performedByAdmin);
            }
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

        Sale saved = saleRepository.save(sale);
        checkAndTriggerReviewTokens(saved);

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
        Sale existing = saleRepository.findById(sale.getId())
                .orElseThrow(() -> new IllegalArgumentException("Sale not found: " + sale.getId()));

        if (isSaleLocked(existing)) {
            throw new SaleLockedException(
                    "Sale " + existing.getInvoiceNumber() + " is locked — resolve the pending "
                    + existing.getSaleStatus().name().toLowerCase().replace("_", " ") + " first.");
        }

        Sale saved = saleRepository.save(sale);
        checkAndTriggerReviewTokens(saved);


        activityLogService.log(performedByAdmin, "UPDATE", "SALES", "sales",
                saved.getInvoiceNumber(), "Sale updated: " + saved.getInvoiceNumber());
        salesLogService.log(performedByAdmin, "Sales", "UPDATE", saved.getInvoiceNumber(),
                salesLogService.saleUpdatedMessage(saved.getInvoiceNumber(), performedByAdmin.getAdminName()));

        return saved;
    }

    // ── Replace / Refund request (lock) ──────────────────────────────────────

    @Transactional
    public Sale requestReplacement(Long saleId, Admin performedByAdmin) {
        Sale sale = findByIdOrThrow(saleId);
        sale.setSaleStatus(SaleStatus.REPLACE_REQUESTED);
        Sale saved = saleRepository.save(sale);

        activityLogService.log(performedByAdmin, "REPLACE_REQUEST", "SALES", "sales",
                saved.getInvoiceNumber(), "Replace requested on: " + saved.getInvoiceNumber());
        salesLogService.log(performedByAdmin, "Sales", "REPLACE_REQUEST", saved.getInvoiceNumber(),
                salesLogService.replaceRequestedMessage(saved.getInvoiceNumber(), performedByAdmin.getAdminName()));

        return saved;
    }

    @Transactional
    public Sale requestRefund(Long saleId, Admin performedByAdmin) {
        Sale sale = findByIdOrThrow(saleId);
        sale.setSaleStatus(SaleStatus.REFUND_REQUESTED);
        Sale saved = saleRepository.save(sale);

        activityLogService.log(performedByAdmin, "REFUND_REQUEST", "SALES", "sales",
                saved.getInvoiceNumber(), "Refund requested on: " + saved.getInvoiceNumber());
        salesLogService.log(performedByAdmin, "Sales", "REFUND_REQUEST", saved.getInvoiceNumber(),
                salesLogService.refundRequestedMessage(saved.getInvoiceNumber(), performedByAdmin.getAdminName()));

        return saved;
    }

    /**
     * Unlock sale after replacement or return/refund is completed.
     * Sets status to PURCHASE_SATISFIED_AND_ORDER_COMPLETED.
     */
    @Transactional
    public Sale unlockSale(Long saleId, Admin performedByAdmin) {
        Sale sale = findByIdOrThrow(saleId);
        sale.setSaleStatus(SaleStatus.PURCHASE_SATISFIED_AND_ORDER_COMPLETED);
        return saleRepository.save(sale);
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
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, pageSize);
        return saleRepository.findPageBeforeId(lastSeenId, pageable);
    }

    @Transactional(readOnly = true)
    public Optional<Sale> findById(Long id) {
        return saleRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<Sale> findByInvoiceNumber(String invoiceNumber) {
        return saleRepository.findByInvoiceNumber(invoiceNumber);
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
            for (SaleLineItem lineItem : sale.getLineItems()) {
                if (lineItem.getItem() != null) {
                    try {
                        reviewService.generateReviewToken(lineItem, sale.getCustomer());
                    } catch (Exception e) {
                        // Log warning gracefully without breaking sale transaction
                    }
                }
            }
        }
    }
}

