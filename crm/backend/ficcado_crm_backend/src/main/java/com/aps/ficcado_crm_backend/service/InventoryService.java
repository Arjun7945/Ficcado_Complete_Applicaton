package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Inventory;
import com.aps.ficcado_crm_backend.entity.InventoryHistory;
import com.aps.ficcado_crm_backend.entity.WarehouseAllocation;
import com.aps.ficcado_crm_backend.entity.enums.InventoryTransactionType;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.repository.InventoryHistoryRepository;
import com.aps.ficcado_crm_backend.repository.InventoryRepository;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.repository.WarehouseAllocationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Manages inventory stock levels and warehouse allocations.
 * Migrated from the inventory logic scattered across the Next.js API routes.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final WarehouseAllocationRepository warehouseAllocationRepository;
    private final InventoryHistoryRepository inventoryHistoryRepository;
    private final ItemRepository itemRepository;
    private final ActivityLogService activityLogService;

    // ── Stock deduction ──────────────────────────────────────────────────────

    /**
     * Deduct stock from main inventory.
     * Called on sale creation when fulfilmentSource = TAKE_FROM_INVENTORY.
     */
    @Transactional
    public void deductFromInventory(Long itemId, String size, int qty,
                                    String invoiceNumber, String transactionType,
                                    Admin performedByAdmin) {
        log.info("Deducting {} unit(s) of item [id={}] size [{}] from inventory for invoice [{}]",
                qty, itemId, size, invoiceNumber);
        if (itemId == null) {
            throw new IllegalArgumentException("Cannot deduct inventory: itemId cannot be null (size: %s)".formatted(size));
        }
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
        log.info("Deducting {} unit(s) of item [id={}] size [{}] from warehouse handler [id={}] for invoice [{}]",
                qty, itemId, size, handlerAdminId, invoiceNumber);
        if (itemId == null) {
            throw new IllegalArgumentException("Cannot deduct warehouse stock: itemId cannot be null (size: %s)".formatted(size));
        }
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
        log.info("Restocking {} unit(s) of item [id={}] size [{}] to [{}] for invoice [{}]",
                qty, itemId, size, restockDestination, invoiceNumber);
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

    @Transactional(readOnly = true)
    public Optional<Inventory> findById(Long id) {
        log.debug("Fetching inventory record [id={}]", id);
        return inventoryRepository.findById(id);
    }

    @Transactional
    public Inventory saveOrUpdateInventory(Long itemId, String itemName, String size,
                                           int targetQty, Admin admin) {
        log.info("Saving/updating inventory: itemId={}, itemName={}, size={}, qty={}",
                itemId, itemName, size, targetQty);

        Item item = null;
        if (itemId != null) {
            item = itemRepository.findById(itemId).orElse(null);
        }
        if (item == null && itemName != null && !itemName.isBlank()) {
            item = itemRepository.findByItemNameIgnoreCase(itemName.trim()).orElse(null);
        }
        if (item == null) {
            throw new IllegalArgumentException("Catalog item not found for ID: " + itemId + " / Name: " + itemName);
        }

        String sizeVal = size != null ? size.trim() : "M";
        final Item targetItem = item;

        Inventory inv = inventoryRepository.findByItemIdAndSize(targetItem.getId(), sizeVal)
                .orElseGet(() -> Inventory.builder()
                        .item(targetItem)
                        .size(sizeVal)
                        .addedByAdmin(admin)
                        .build());

        inv.setTotalQuantity(targetQty);
        inv.setUpdatedByAdmin(admin);

        Inventory saved = inventoryRepository.save(inv);
        activityLogService.log(admin, "SAVE", "INVENTORY", "inventory",
                saved.getId().toString(),
                "Inventory saved: " + item.getItemName() + " size " + sizeVal
                        + " qty " + targetQty);

        log.info("Inventory saved successfully [id={}, item={}, size={}, qty={}]",
                saved.getId(), item.getItemName(), sizeVal, targetQty);
        return saved;
    }

    @Transactional
    public Optional<Inventory> adjustQuantity(Long id, int targetQuantity, Admin admin) {
        return adjustQuantity(id, targetQuantity, null, admin);
    }

    @Transactional
    public Optional<Inventory> adjustQuantity(Long id, int targetQuantity, String reason, Admin admin) {
        log.info("Adjusting inventory quantity for [id={}] to {}, reason={}", id, targetQuantity, reason);
        return inventoryRepository.findById(id).map(inv -> {
            int oldQty = inv.getTotalQuantity();
            inv.setTotalQuantity(targetQuantity);
            inv.setUpdatedByAdmin(admin);
            Inventory saved = inventoryRepository.save(inv);

            String message = buildAdjustMessage(inv.getItem().getItemName(), inv.getSize(), oldQty, targetQuantity, reason);

            activityLogService.log(admin, "ADJUST", "INVENTORY", "inventory",
                    saved.getId().toString(),
                    message);

            log.info("Inventory [id={}] adjusted from {} to {}", id, oldQty, targetQuantity);
            return saved;
        });
    }

    public static String buildAdjustMessage(String itemName, String size, int oldQty, int targetQuantity, String reason) {
        String base = "Inventory adjusted: " + itemName + " size " + size + " from " + oldQty + " → " + targetQuantity;
        if (reason != null && !reason.trim().isEmpty()) {
            return base + " — " + reason.trim();
        }
        return base;
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
                .resultingBalanceNote(resultingBalanceNote != null ? resultingBalanceNote : "Standard_Balance_Update")
                .notes(invoiceNumber != null ? "Transaction for " + invoiceNumber : "Routine_Inventory_Update")
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
