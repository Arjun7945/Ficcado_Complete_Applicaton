package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.DamagedProductDto.DamagedResponse;
import com.aps.ficcado_crm_backend.dto.DamagedProductDto.ManualDamagedRequest;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.DamagedProduct;
import com.aps.ficcado_crm_backend.mapper.DamagedProductMapper;
import com.aps.ficcado_crm_backend.service.DamagedProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/damaged-products")
@Tag(name = "Damaged Products")
@RequiredArgsConstructor
public class DamagedProductController {

    private final DamagedProductService damagedProductService;

    @GetMapping
    @Operation(summary = "List all damaged products")
    public List<DamagedResponse> getAll() {
        return damagedProductService.getAll().stream()
                .map(DamagedProductMapper::toResponse)
                .toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get damaged product by ID")
    public ResponseEntity<DamagedResponse> getById(@PathVariable Long id) {
        return damagedProductService.findById(id)
                .map(DamagedProductMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Manually log a damaged product")
    public ResponseEntity<DamagedResponse> createManual(@Valid @RequestBody ManualDamagedRequest request,
                                                        @AuthenticationPrincipal Admin admin) {
        log.info("Creating manual damaged product entry for item: {}, size: {}, qty: {}",
                request.itemName(), request.size(), request.quantity());
        DamagedProduct saved = damagedProductService.createManual(
                request.itemId(), request.itemName(), request.size(),
                request.quantity(), request.reasonNotes(), admin);
        return ResponseEntity.status(HttpStatus.CREATED).body(DamagedProductMapper.toResponse(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a damaged product record")
    public ResponseEntity<DamagedResponse> update(@PathVariable Long id,
                                                  @Valid @RequestBody ManualDamagedRequest request,
                                                  @AuthenticationPrincipal Admin admin) {
        log.info("Updating damaged product entry [id={}]", id);
        return damagedProductService.update(
                id, request.itemId(), request.itemName(), request.size(),
                request.quantity(), request.reasonNotes(), admin)
                .map(DamagedProductMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a damaged product record")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        log.info("Deleting damaged product entry [id={}]", id);
        damagedProductService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
