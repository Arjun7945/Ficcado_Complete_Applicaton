package com.aps.ficcado_inventory_sales_management_app.service;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.Inventory;
import com.aps.ficcado_inventory_sales_management_app.entity.InventoryHistory;
import com.aps.ficcado_inventory_sales_management_app.entity.WarehouseAllocation;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.InventoryTransactionType;
import com.aps.ficcado_inventory_sales_management_app.repository.InventoryHistoryRepository;
import com.aps.ficcado_inventory_sales_management_app.repository.InventoryRepository;
import com.aps.ficcado_inventory_sales_management_app.repository.WarehouseAllocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Manages inventory stock levels and warehouse allocations.
 * Migrated from the inventory logic scattered across the Next.js API routes.
 */
@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final WarehouseAllocationRepository warehouseAllocationRepository;
    private final InventoryHistoryRepository inventoryHistoryRepository;

    // ── Stock deduction ──────────────────────────────────────────────────────

    /**
     * Deduct stock from main inventory.
     * Called on sale creation when fulfilmentSource = TAKE_FROM_INVENTORY.
     */
    @Transactional
    public void deductFromInventory(Long itemId, String size, int qty,
                                    String invoiceNumber, String transactionType,
                                    Admin performedByAdmin) {
        Inventory inv = inventoryRepository.findByItemIdAndSize(itemId, size)
                .orElseThrow(() -> new IllegalStateException(
                        "Inventory record not found for item %d, size %s".formatted(itemId, size)));

        if (inv.getTotalQuantity() < qty) {
            throw new IllegalStateException(
                    "Insufficient stock: only %d piece(s) available for %s size %s"
                            .formatted(inv.getTotalQuantity(), inv.getItem().getItemName(), size));
        }

        inv.setTotalQuantity(inv.getTotalQuantity() - qty);
        inventoryRepository.save(inv);

        logInventoryHistory(inv.getItem().getId(), inv.getItem().getItemName(), size,
                -qty, "INVENTORY", null,
                InventoryTransactionType.valueOf(transactionType),
                invoiceNumber, inv.getTotalQuantity(), null,
                performedByAdmin);
    }

    /**
     * Deduct stock from a warehouse handler's allocation.
     * Called on sale creation when fulfilmentSource = WAREHOUSE_HANDLER.
     */
    @Transactional
    public void deductFromWarehouse(Long handlerAdminId, Long itemId, String size, int qty,
                                    String invoiceNumber, String transactionType,
                                    Admin performedByAdmin) {
        WarehouseAllocation wa = warehouseAllocationRepository
                .findByHandlerAdminIdAndItemIdAndSize(handlerAdminId, itemId, size)
                .orElseThrow(() -> new IllegalStateException(
                        "No warehouse allocation found for handler %d, item %d, size %s"
                                .formatted(handlerAdminId, itemId, size)));

        if (wa.getQuantity() < qty) {
            throw new IllegalStateException(
                    "Insufficient warehouse stock: only %d piece(s) available".formatted(wa.getQuantity()));
        }

        wa.setQuantity(wa.getQuantity() - qty);
        warehouseAllocationRepository.save(wa);

        logInventoryHistory(wa.getItem().getId(), wa.getItem().getItemName(), size,
                -qty, "WAREHOUSE", wa.getHandlerAdmin(),
                InventoryTransactionType.valueOf(transactionType),
                invoiceNumber, wa.getQuantity(), null,
                performedByAdmin);
    }

    /**
     * Restock inventory (e.g. returned item disposition: RETURNED_TO_INVENTORY).
     */
    @Transactional
    public void restockInventory(Long itemId, String size, int qty,
                                 String invoiceNumber, InventoryTransactionType transactionType,
                                 String restockDestination, Admin performedByAdmin) {
        if ("INVENTORY".equalsIgnoreCase(restockDestination)) {
            Inventory inv = inventoryRepository.findByItemIdAndSize(itemId, size)
                    .orElseThrow(() -> new IllegalStateException(
                            "Inventory record not found for item %d, size %s".formatted(itemId, size)));
            inv.setTotalQuantity(inv.getTotalQuantity() + qty);
            inventoryRepository.save(inv);

            logInventoryHistory(itemId, inv.getItem().getItemName(), size,
                    +qty, "INVENTORY", null, transactionType,
                    invoiceNumber, inv.getTotalQuantity(), null, performedByAdmin);
        }
        // If restockDestination points to a warehouse, the caller handles that separately.
    }

    // ── Unallocated balance (warehouse allocation cap) ────────────────────────

    /**
     * Returns how many units of item+size are unallocated to any warehouse.
     * Used to enforce the "Only X piece(s) remain unallocated" validation gate.
     */
    @Transactional(readOnly = true)
    public int getUnallocatedQuantity(Long itemId, String size) {
        return inventoryRepository.findUnallocatedQuantity(itemId, size).orElse(0);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Inventory> getAll() {
        return inventoryRepository.findAllWithItem();
    }

    @Transactional(readOnly = true)
    public Optional<Inventory> findByItemAndSize(Long itemId, String size) {
        return inventoryRepository.findByItemIdAndSize(itemId, size);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private void logInventoryHistory(Long itemId, String itemName, String size,
                                     int quantityChange, String affectedLocation,
                                     Admin handlerAdmin, InventoryTransactionType transactionType,
                                     String invoiceNumber, Integer resultingBalance,
                                     String resultingBalanceNote, Admin performedByAdmin) {
        InventoryHistory entry = InventoryHistory.builder()
                .itemName(itemName)
                .size(size)
                .quantityChange(quantityChange)
                .affectedLocation(affectedLocation)
                .handlerAdmin(handlerAdmin)
                .transactionType(transactionType)
                .relatedInvoiceNumber(invoiceNumber)
                .resultingBalance(resultingBalance)
                .resultingBalanceNote(resultingBalanceNote)
                .admin(performedByAdmin)
                .adminName(performedByAdmin != null ? performedByAdmin.getAdminName() : "System")
                .build();

        // Set item FK if we have an ID
        if (itemId != null) {
            inventoryRepository.findById(itemId).ifPresent(inv ->
                    entry.setItem(inv.getItem()));
        }

        inventoryHistoryRepository.save(entry);
    }
}
