package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.Item;
import com.aps.ficcado_inventory_sales_management_app.entity.WarehouseAllocation;
import com.aps.ficcado_inventory_sales_management_app.repository.ItemRepository;
import com.aps.ficcado_inventory_sales_management_app.repository.WarehouseAllocationRepository;
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
import java.util.Map;

@RestController
@RequestMapping("/api/warehouse")
@Tag(name = "Warehouse Allocations")
@RequiredArgsConstructor
public class WarehouseController {

    private final WarehouseAllocationRepository warehouseRepo;
    private final ItemRepository itemRepository;
    private final InventoryService inventoryService;
    private final ActivityLogService activityLogService;

    @GetMapping
    @Operation(summary = "List all warehouse allocations")
    public List<WarehouseResponse> getAll() {
        return warehouseRepo.findAllWithDetails().stream().map(WarehouseResponse::from).toList();
    }

    @GetMapping("/by-handler/{adminId}")
    @Operation(summary = "Get allocations for a specific handler admin")
    public List<WarehouseResponse> byHandler(@PathVariable Long adminId) {
        return warehouseRepo.findByHandlerAdminId(adminId)
                .stream().map(WarehouseResponse::from).toList();
    }

    @PostMapping
    @Operation(summary = "Create warehouse allocation (with unallocated-balance cap check)")
    public ResponseEntity<WarehouseResponse> create(@RequestBody WarehouseRequest request,
                                                    @AuthenticationPrincipal Admin admin) {
        // Enforce cap: can't allocate more than unallocated inventory
        int unallocated = inventoryService.getUnallocatedQuantity(request.itemId(), request.size());
        if (request.quantity() > unallocated) {
            throw new IllegalStateException(
                    "Cannot allocate %d piece(s). Only %d piece(s) remain unallocated for this item/size."
                            .formatted(request.quantity(), unallocated));
        }

        Item item = itemRepository.findById(request.itemId())
                .orElseThrow(() -> new IllegalArgumentException("Item not found: " + request.itemId()));

        WarehouseAllocation wa = WarehouseAllocation.builder()
                .warehouseLocation(request.warehouseLocation())
                .item(item)
                .size(request.size())
                .quantity(request.quantity())
                .createdByAdmin(admin)
                .updatedByAdmin(admin)
                .build();

        // Set handler admin if provided
        if (request.handlerAdminId() != null) {
            Admin handler = new Admin();
            handler.setId(request.handlerAdminId());
            wa.setHandlerAdmin(handler);
        }

        WarehouseAllocation saved = warehouseRepo.save(wa);
        activityLogService.log(admin, "CREATE", "WAREHOUSE", "warehouse",
                saved.getId().toString(),
                "Warehouse allocation created: " + item.getItemName() + " size " + request.size()
                + " qty " + request.quantity() + " at " + request.warehouseLocation());

        return ResponseEntity.status(HttpStatus.CREATED).body(WarehouseResponse.from(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update warehouse allocation quantity")
    public ResponseEntity<WarehouseResponse> update(@PathVariable Long id,
                                                    @RequestBody Map<String, Integer> body,
                                                    @AuthenticationPrincipal Admin admin) {
        return warehouseRepo.findById(id).map(wa -> {
            int newQty = body.get("quantity");

            // Recalculate cap: current allocated (minus this record) + new qty
            int currentAllocatedExcludingThis = warehouseRepo
                    .sumAllocatedQuantity(wa.getItem().getId(), wa.getSize()).orElse(0)
                    - wa.getQuantity();
            int unallocated = inventoryService.getUnallocatedQuantity(
                    wa.getItem().getId(), wa.getSize());
            if (newQty > (unallocated + wa.getQuantity())) {
                throw new IllegalStateException(
                        "New quantity exceeds available unallocated stock.");
            }

            wa.setQuantity(newQty);
            wa.setUpdatedByAdmin(admin);
            WarehouseAllocation saved = warehouseRepo.save(wa);
            activityLogService.log(admin, "UPDATE", "WAREHOUSE", "warehouse",
                    id.toString(), "Warehouse allocation updated: qty → " + newQty);
            return ResponseEntity.ok(WarehouseResponse.from(saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete warehouse allocation")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal Admin admin) {
        warehouseRepo.findById(id).ifPresent(wa -> {
            activityLogService.log(admin, "DELETE", "WAREHOUSE", "warehouse",
                    id.toString(), "Warehouse allocation deleted");
            warehouseRepo.deleteById(id);
        });
        return ResponseEntity.noContent().build();
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    record WarehouseRequest(String warehouseLocation, Long handlerAdminId,
                             Long itemId, String size, int quantity) {}

    record WarehouseResponse(Long id, String warehouseLocation, Long handlerAdminId,
                              String handlerAdminName, Long itemId, String itemName,
                              String size, int quantity) {
        static WarehouseResponse from(WarehouseAllocation wa) {
            return new WarehouseResponse(
                    wa.getId(), wa.getWarehouseLocation(),
                    wa.getHandlerAdmin() != null ? wa.getHandlerAdmin().getId() : null,
                    wa.getHandlerAdmin() != null ? wa.getHandlerAdmin().getAdminName() : null,
                    wa.getItem() != null ? wa.getItem().getId() : null,
                    wa.getItem() != null ? wa.getItem().getItemName() : null,
                    wa.getSize(), wa.getQuantity());
        }
    }
}
