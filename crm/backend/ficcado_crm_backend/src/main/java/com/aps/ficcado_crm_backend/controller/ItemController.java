package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.ItemDto.ItemRequest;
import com.aps.ficcado_crm_backend.dto.ItemDto.ItemResponse;
import com.aps.ficcado_crm_backend.dto.ItemDto.StatusToggleRequest;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.enums.ItemStatus;
import com.aps.ficcado_crm_backend.mapper.ItemMapper;
import com.aps.ficcado_crm_backend.service.ItemService;
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
@RequestMapping("/api/items")
@Tag(name = "Items")
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @GetMapping
    @Operation(summary = "List all items")
    public List<ItemResponse> getAll() {
        log.info("REST request to list all catalog items");
        return itemService.getAll().stream()
                .map(ItemMapper::toResponse)
                .toList();
    }

    @GetMapping("/active")
    @Operation(summary = "List active items with sizes (for sale dropdowns)")
    public List<ItemResponse> getActive() {
        log.info("REST request to list active catalog items");
        return itemService.getActiveItemsWithSizes()
                .stream()
                .map(ItemMapper::toResponse)
                .toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get item by ID")
    public ResponseEntity<ItemResponse> getById(@PathVariable Long id) {
        log.info("REST request to get item [id={}]", id);
        return itemService.getById(id)
                .map(ItemMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create item")
    public ResponseEntity<ItemResponse> create(@Valid @RequestBody ItemRequest request,
                                               @AuthenticationPrincipal Admin admin) {
        log.info("REST request to create item: {}, status: {}", request.itemName(), request.effectiveStatus());
        Item saved = itemService.createItem(
                request.itemName(),
                request.itemType(),
                request.priceOfItem(),
                request.costPrice(),
                request.effectiveSizes(),
                request.effectiveStatus(),
                admin
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ItemMapper.toResponse(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update item")
    public ResponseEntity<ItemResponse> update(@PathVariable Long id,
                                               @Valid @RequestBody ItemRequest request,
                                               @AuthenticationPrincipal Admin admin) {
        log.info("REST request to update item [id={}]", id);
        return itemService.updateItem(
                id,
                request.itemName(),
                request.itemType(),
                request.priceOfItem(),
                request.costPrice(),
                request.effectiveSizes(),
                request.effectiveStatus(),
                admin
        ).map(ItemMapper::toResponse)
         .map(ResponseEntity::ok)
         .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Toggle item status ACTIVE/INACTIVE")
    public ResponseEntity<ItemResponse> toggleStatus(@PathVariable Long id,
                                                     @Valid @RequestBody StatusToggleRequest request,
                                                     @AuthenticationPrincipal Admin admin) {
        log.info("REST request to toggle status for item [id={}] to {}", id, request.status());
        ItemStatus newStatus = ItemStatus.fromString(request.status());
        return itemService.toggleStatus(id, newStatus, admin)
                .map(ItemMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete item by ID")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal Admin admin) {
        log.info("REST request to delete item [id={}]", id);
        boolean deleted = itemService.deleteItem(id, admin);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
