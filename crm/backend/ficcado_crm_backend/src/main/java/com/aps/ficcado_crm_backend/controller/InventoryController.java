package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.InventoryDto.InventoryRequest;
import com.aps.ficcado_crm_backend.dto.InventoryDto.InventoryResponse;
import com.aps.ficcado_crm_backend.dto.InventoryDto.QuantityAdjustRequest;
import com.aps.ficcado_crm_backend.dto.InventoryDto.UnallocatedResponse;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.mapper.InventoryMapper;
import com.aps.ficcado_crm_backend.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@Validated
@RestController
@RequestMapping("/api/inventory")
@Tag(name = "Inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    @Operation(summary = "List all inventory records")
    public List<InventoryResponse> getAll() {
        log.info("REST request to list all inventory records");
        return inventoryService.getAll().stream()
                .map(InventoryMapper::toResponse)
                .toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get inventory record by ID")
    public ResponseEntity<InventoryResponse> getById(@PathVariable Long id) {
        log.info("REST request to get inventory record [id={}]", id);
        return inventoryService.findById(id)
                .map(InventoryMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/unallocated")
    @Operation(summary = "Get unallocated quantity for an item+size (warehouse allocation cap check)")
    public ResponseEntity<UnallocatedResponse> getUnallocated(@RequestParam Long itemId,
                                                               @RequestParam String size) {
        log.debug("REST request for unallocated quantity: itemId={}, size={}", itemId, size);
        int unallocated = inventoryService.getUnallocatedQuantity(itemId, size);
        return ResponseEntity.ok(new UnallocatedResponse(itemId, size, unallocated));
    }

    @PostMapping
    @Operation(summary = "Add or update an inventory record (item + size + quantity)")
    public ResponseEntity<InventoryResponse> create(@Valid @RequestBody InventoryRequest request,
                                                    @AuthenticationPrincipal Admin admin) {
        log.info("REST request to create/update inventory: itemId={}, itemName={}, size={}",
                request.itemId(), request.itemName(), request.size());
        int targetQty = request.totalQuantity() != null ? request.totalQuantity() : (request.qty() != null ? request.qty() : 0);
        var saved = inventoryService.saveOrUpdateInventory(
                request.itemId(), request.itemName(), request.size(), targetQty, admin);
        return ResponseEntity.status(HttpStatus.CREATED).body(InventoryMapper.toResponse(saved));
    }

    @PutMapping("/{id}/quantity")
    @Operation(summary = "Manually adjust total quantity (stock count correction)")
    public ResponseEntity<InventoryResponse> adjustQuantity(@PathVariable Long id,
                                                             @Valid @RequestBody QuantityAdjustRequest request,
                                                             @AuthenticationPrincipal Admin admin) {
        log.info("REST request to adjust inventory [id={}] quantity to {}", id, request.totalQuantity());
        return inventoryService.adjustQuantity(id, request.totalQuantity(), admin)
                .map(InventoryMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
