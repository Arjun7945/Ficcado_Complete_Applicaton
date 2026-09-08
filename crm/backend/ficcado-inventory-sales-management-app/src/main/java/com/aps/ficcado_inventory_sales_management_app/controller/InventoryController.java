package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.Inventory;
import com.aps.ficcado_inventory_sales_management_app.entity.Item;
import com.aps.ficcado_inventory_sales_management_app.repository.InventoryRepository;
import com.aps.ficcado_inventory_sales_management_app.repository.ItemRepository;
import com.aps.ficcado_inventory_sales_management_app.service.ActivityLogService;
import com.aps.ficcado_inventory_sales_management_app.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@Tag(name = "Inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryRepository inventoryRepository;
    private final ItemRepository itemRepository;
    private final InventoryService inventoryService;
    private final ActivityLogService activityLogService;

    @GetMapping
    @Operation(summary = "List all inventory records")
    public List<InventoryResponse> getAll() {
        return inventoryService.getAll().stream().map(InventoryResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get inventory record by ID")
    public ResponseEntity<InventoryResponse> getById(@PathVariable Long id) {
        return inventoryRepository.findById(id)
                .map(InventoryResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/unallocated")
    @Operation(summary = "Get unallocated quantity for an item+size (warehouse allocation cap check)")
    public ResponseEntity<UnallocatedResponse> getUnallocated(@RequestParam Long itemId,
                                                               @RequestParam String size) {
        int unallocated = inventoryService.getUnallocatedQuantity(itemId, size);
        return ResponseEntity.ok(new UnallocatedResponse(itemId, size, unallocated));
    }

    @PostMapping
    @Operation(summary = "Add or update an inventory record (item + size + quantity)")
    public ResponseEntity<InventoryResponse> create(@RequestBody InventoryRequest request,
                                                    @AuthenticationPrincipal Admin admin) {
        Item item = null;
        if (request.itemId() != null) {
            item = itemRepository.findById(request.itemId()).orElse(null);
        }
        if (item == null && request.itemName() != null && !request.itemName().isBlank()) {
            item = itemRepository.findByItemNameIgnoreCase(request.itemName().trim()).orElse(null);
        }
        if (item == null) {
            throw new IllegalArgumentException("Catalog item not found for ID: " + request.itemId() + " / Name: " + request.itemName());
        }

        int targetQty = request.totalQuantity() != null ? request.totalQuantity() : (request.qty() != null ? request.qty() : 0);
        String sizeVal = request.size() != null ? request.size().trim() : "M";

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

        return ResponseEntity.status(HttpStatus.CREATED).body(InventoryResponse.from(saved));
    }

    @PutMapping("/{id}/quantity")
    @Operation(summary = "Manually adjust total quantity (stock count correction)")
    public ResponseEntity<InventoryResponse> adjustQuantity(@PathVariable Long id,
                                                             @RequestBody QuantityAdjustRequest request,
                                                             @AuthenticationPrincipal Admin admin) {
        return inventoryRepository.findById(id).map(inv -> {
            int oldQty = inv.getTotalQuantity();
            inv.setTotalQuantity(request.totalQuantity());
            inv.setUpdatedByAdmin(admin);
            Inventory saved = inventoryRepository.save(inv);

            activityLogService.log(admin, "ADJUST", "INVENTORY", "inventory",
                    saved.getId().toString(),
                    "Inventory adjusted: " + inv.getItem().getItemName()
                    + " size " + inv.getSize() + " from " + oldQty + " → " + request.totalQuantity());

            return ResponseEntity.ok(InventoryResponse.from(saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    record InventoryRequest(Long itemId, String itemName, String size, Integer totalQuantity, Integer qty) {}

    record QuantityAdjustRequest(int totalQuantity) {}

    record UnallocatedResponse(Long itemId, String size, int unallocatedQuantity) {}

    record InventoryResponse(Long id, Long itemId, String itemName, String size,
                              int totalQuantity, String currentStatus) {
        static InventoryResponse from(Inventory inv) {
            return new InventoryResponse(
                    inv.getId(),
                    inv.getItem() != null ? inv.getItem().getId() : null,
                    inv.getItem() != null ? inv.getItem().getItemName() : null,
                    inv.getSize(),
                    inv.getTotalQuantity(),
                    inv.getCurrentStatus());
        }
    }
}
