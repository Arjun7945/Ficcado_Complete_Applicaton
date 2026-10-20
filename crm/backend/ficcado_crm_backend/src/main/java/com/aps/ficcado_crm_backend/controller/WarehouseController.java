package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.WarehouseDto.AllocationUpdateRequest;
import com.aps.ficcado_crm_backend.dto.WarehouseDto.WarehouseRequest;
import com.aps.ficcado_crm_backend.dto.WarehouseDto.WarehouseResponse;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.mapper.WarehouseMapper;
import com.aps.ficcado_crm_backend.service.WarehouseService;
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
@RequestMapping("/api/warehouse")
@Tag(name = "Warehouse Allocations")
@RequiredArgsConstructor
public class WarehouseController {

    private final WarehouseService warehouseService;

    @GetMapping
    @Operation(summary = "List all warehouse allocations")
    public List<WarehouseResponse> getAll() {
        log.info("REST request to list all warehouse allocations");
        return warehouseService.getAll().stream()
                .map(WarehouseMapper::toResponse)
                .toList();
    }

    @GetMapping("/by-handler/{adminId}")
    @Operation(summary = "Get allocations for a specific handler admin")
    public List<WarehouseResponse> byHandler(@PathVariable Long adminId) {
        log.info("REST request to list warehouse allocations for handler admin [id={}]", adminId);
        return warehouseService.findByHandlerAdminId(adminId)
                .stream()
                .map(WarehouseMapper::toResponse)
                .toList();
    }

    @PostMapping
    @Operation(summary = "Create warehouse allocation (with unallocated-balance cap check)")
    public ResponseEntity<WarehouseResponse> create(@Valid @RequestBody WarehouseRequest request,
                                                    @AuthenticationPrincipal Admin admin) {
        log.info("REST request to create warehouse allocation: location={}, size={}, qty={}",
                request.warehouseLocation(), request.size(), request.quantity());
        var saved = warehouseService.createAllocation(request, admin);
        return ResponseEntity.status(HttpStatus.CREATED).body(WarehouseMapper.toResponse(saved));
    }

    @PostMapping("/batch")
    @Operation(summary = "Batch allocate warehouse items")
    public ResponseEntity<List<WarehouseResponse>> createBatch(@RequestBody List<@Valid WarehouseRequest> requests,
                                                               @AuthenticationPrincipal Admin admin) {
        log.info("REST request to batch create {} warehouse allocations", requests.size());
        var savedList = warehouseService.createBatch(requests, admin);
        var responses = savedList.stream().map(WarehouseMapper::toResponse).toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(responses);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update warehouse allocation quantity")
    public ResponseEntity<WarehouseResponse> update(@PathVariable Long id,
                                                    @Valid @RequestBody AllocationUpdateRequest request,
                                                    @AuthenticationPrincipal Admin admin) {
        log.info("REST request to update warehouse allocation [id={}] to qty={}", id, request.quantity());
        return warehouseService.updateQuantity(id, request.quantity(), admin)
                .map(WarehouseMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete warehouse allocation")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal Admin admin) {
        log.info("REST request to delete warehouse allocation [id={}]", id);
        boolean deleted = warehouseService.deleteAllocation(id, admin);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/by-location-handler")
    @Operation(summary = "Delete allocations by location and handler name")
    public ResponseEntity<Void> deleteByLocationAndHandler(@RequestParam String location,
                                                           @RequestParam(required = false) String handler,
                                                           @AuthenticationPrincipal Admin admin) {
        log.info("REST request to delete warehouse allocations by location: {} and handler: {}", location, handler);
        warehouseService.deleteByLocationAndHandler(location, handler, admin);
        return ResponseEntity.noContent().build();
    }
}
