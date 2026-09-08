package com.aps.ficcado_inventory_sales_management_app.service;

import com.aps.ficcado_inventory_sales_management_app.entity.*;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.*;
import com.aps.ficcado_inventory_sales_management_app.exception.BusinessRuleException;
import com.aps.ficcado_inventory_sales_management_app.repository.ReplacementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Manages the full replacement workflow.
 * Migrated from app/api/replacement/ route handlers.
 *
 * Multi-step status progression:
 * APPROVED → DISPATCHED → RECEIVED → SATISFIED_AND_COMPLETED
 *
 * On complete:
 * - Old items: RETURNED_TO_INVENTORY (restock) or SENT_TO_DAMAGED_PRODUCTS
 * - New items: deducted from inventory (or warehouse handler)
 * - Sales record: unlocked (status → PURCHASE_SATISFIED_AND_ORDER_COMPLETED)
 */
@Service
@RequiredArgsConstructor
public class ReplacementService {

    private final ReplacementRepository replacementRepository;
    private final InventoryService inventoryService;
    private final DamagedProductService damagedProductService;
    private final SaleService saleService;
    private final ActivityLogService activityLogService;
    private final SalesLogService salesLogService;

    @Transactional
    public Replacement create(Replacement replacement, Admin performedByAdmin) {
        replacement.setInvoiceStatus(ReplacementStatus.APPROVED);
        Replacement saved = replacementRepository.save(replacement);

        activityLogService.log(performedByAdmin, "CREATE", "REPLACEMENT", "replacement",
                saved.getInvoiceNumber(), "Replacement created for " + saved.getInvoiceNumber());

        return saved;
    }

    @Transactional
    public Replacement saveProgress(Long id, ReplacementStatus newStatus, Admin performedByAdmin) {
        Replacement replacement = findByIdOrThrow(id);
        replacement.setInvoiceStatus(newStatus);
        Replacement saved = replacementRepository.save(replacement);

        activityLogService.log(performedByAdmin, "UPDATE", "REPLACEMENT", "replacement",
                saved.getInvoiceNumber(),
                "Replacement " + saved.getInvoiceNumber() + " status → " + newStatus.name());

        return saved;
    }

    /**
     * Complete the replacement:
     * 1. Deduct new items from stock (inventory or warehouse)
     * 2. Handle old item disposition (restock or damaged products)
     * 3. Set replacement status → SATISFIED_AND_COMPLETED
     * 4. Unlock the sale
     */
    @Transactional
    public Replacement complete(Long id, Admin performedByAdmin) {
        Replacement replacement = replacementRepository.findByIdWithItems(id)
                .orElseThrow(() -> new IllegalArgumentException("Replacement not found: " + id));

        // 1. Deduct new items from stock
        for (ReplacementNewItem newItem : replacement.getNewItems()) {
            if (replacement.getNewStockSource() == FulfilmentSource.TAKE_FROM_INVENTORY) {
                inventoryService.deductFromInventory(
                        newItem.getItem() != null ? newItem.getItem().getId() : null,
                        newItem.getSize(), newItem.getQuantity(),
                        replacement.getInvoiceNumber(),
                        InventoryTransactionType.REPLACEMENT.name(), performedByAdmin);
            } else if (replacement.getNewStockSource() == FulfilmentSource.WAREHOUSE_HANDLER
                    && replacement.getCreatedByAdmin() != null) {
                inventoryService.deductFromWarehouse(
                        replacement.getCreatedByAdmin().getId(),
                        newItem.getItem() != null ? newItem.getItem().getId() : null,
                        newItem.getSize(), newItem.getQuantity(),
                        replacement.getInvoiceNumber(),
                        InventoryTransactionType.REPLACEMENT.name(), performedByAdmin);
            }
        }

        // 2. Handle old item disposition
        for (ReplacementOldItem oldItem : replacement.getOldItems()) {
            if (replacement.getDispositionOfOldItems() == DispositionOfItems.RETURNED_TO_INVENTORY) {
                inventoryService.restockInventory(
                        oldItem.getItem() != null ? oldItem.getItem().getId() : null,
                        oldItem.getSize(), oldItem.getQuantity(),
                        replacement.getInvoiceNumber(),
                        InventoryTransactionType.REPLACEMENT,
                        replacement.getRestockDestination(), performedByAdmin);
            } else if (replacement.getDispositionOfOldItems() == DispositionOfItems.SENT_TO_DAMAGED_PRODUCTS) {
                damagedProductService.recordFromDisposition(
                        replacement.getSale(),
                        oldItem.getItem() != null ? oldItem.getItem().getId() : null,
                        oldItem.getItemName(), oldItem.getSize(), oldItem.getQuantity(),
                        "From replacement of " + replacement.getInvoiceNumber(),
                        DamagedProductSource.REPLACEMENT, performedByAdmin);
            }
        }

        // 3. Mark completed
        replacement.setInvoiceStatus(ReplacementStatus.SATISFIED_AND_COMPLETED);
        Replacement saved = replacementRepository.save(replacement);

        // 4. Unlock sale
        saleService.unlockSale(replacement.getSale().getId(), performedByAdmin);

        // 5. Logs
        String dispositionLabel = replacement.getDispositionOfOldItems() != null
                ? replacement.getDispositionOfOldItems().name().replace("_", " ").toLowerCase()
                : "unspecified";

        activityLogService.log(performedByAdmin, "COMPLETE", "REPLACEMENT", "replacement",
                saved.getInvoiceNumber(), "Replacement " + saved.getInvoiceNumber() + " completed.");

        salesLogService.log(performedByAdmin, "Replacement", "COMPLETE", saved.getInvoiceNumber(),
                salesLogService.replacementCompletedMessage(
                        saved.getInvoiceNumber(), performedByAdmin.getAdminName(), dispositionLabel));

        return saved;
    }

    @Transactional(readOnly = true)
    public List<Replacement> getAll() {
        return replacementRepository.findAllWithItems();
    }

    @Transactional(readOnly = true)
    public Optional<Replacement> findById(Long id) {
        return replacementRepository.findByIdWithItems(id);
    }

    private Replacement findByIdOrThrow(Long id) {
        return replacementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Replacement not found: " + id));
    }
}
