package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.DamagedProduct;
import com.aps.ficcado_inventory_sales_management_app.service.DamagedProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/damaged-products")
@Tag(name = "Damaged Products")
@RequiredArgsConstructor
public class DamagedProductController {

    private final DamagedProductService damagedProductService;

    @GetMapping
    @Operation(summary = "List all damaged products")
    public List<DamagedResponse> getAll() {
        return damagedProductService.getAll().stream().map(DamagedResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get damaged product by ID")
    public ResponseEntity<DamagedResponse> getById(@PathVariable Long id) {
        return damagedProductService.findById(id)
                .map(DamagedResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Manually log a damaged product")
    public ResponseEntity<DamagedResponse> createManual(@RequestBody ManualDamagedRequest request,
                                                        @AuthenticationPrincipal Admin admin) {
        DamagedProduct saved = damagedProductService.createManual(
                request.itemId(), request.itemName(), request.size(),
                request.quantity(), request.reasonNotes(), admin);
        return ResponseEntity.status(HttpStatus.CREATED).body(DamagedResponse.from(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a damaged product record")
    public ResponseEntity<DamagedResponse> update(@PathVariable Long id,
                                                  @RequestBody ManualDamagedRequest request,
                                                  @AuthenticationPrincipal Admin admin) {
        return damagedProductService.update(
                id, request.itemId(), request.itemName(), request.size(),
                request.quantity(), request.reasonNotes(), admin)
                .map(DamagedResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a damaged product record")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        damagedProductService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    record ManualDamagedRequest(Long itemId, String itemName, String size,
                                int quantity, String reasonNotes) {}

    record DamagedResponse(Long id, String invoiceNumber, Long saleId,
                            Long itemId, String itemName, String size,
                            int quantity, String customerName,
                            String reasonNotes, String source, Instant createdAt) {
        static DamagedResponse from(DamagedProduct d) {
            return new DamagedResponse(
                    d.getId(), d.getInvoiceNumber(),
                    d.getSale() != null ? d.getSale().getId() : null,
                    d.getItem() != null ? d.getItem().getId() : null,
                    d.getItemName(), d.getSize(), d.getQuantity(),
                    d.getCustomerName(), d.getReasonNotes(),
                    d.getSource() != null ? d.getSource().name() : null,
                    d.getCreatedAt());
        }
    }
}
