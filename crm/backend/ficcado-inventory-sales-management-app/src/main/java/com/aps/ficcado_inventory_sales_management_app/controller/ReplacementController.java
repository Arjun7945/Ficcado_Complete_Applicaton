package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.*;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.*;
import com.aps.ficcado_inventory_sales_management_app.repository.ItemRepository;
import com.aps.ficcado_inventory_sales_management_app.repository.SaleRepository;
import com.aps.ficcado_inventory_sales_management_app.service.ReplacementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/replacements")
@Tag(name = "Replacements")
@RequiredArgsConstructor
public class ReplacementController {

    private final ReplacementService replacementService;
    private final SaleRepository saleRepository;
    private final ItemRepository itemRepository;

    @GetMapping
    @Operation(summary = "List all replacements")
    public List<ReplacementResponse> getAll() {
        return replacementService.getAll().stream().map(ReplacementResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get replacement by ID")
    public ResponseEntity<ReplacementResponse> getById(@PathVariable Long id) {
        return replacementService.findById(id)
                .map(ReplacementResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create replacement request from a locked sale")
    public ResponseEntity<ReplacementResponse> create(@RequestBody ReplacementRequest request,
                                                      @AuthenticationPrincipal Admin admin) {
        Sale sale = saleRepository.findById(request.saleId())
                .orElseThrow(() -> new IllegalArgumentException("Sale not found: " + request.saleId()));

        Replacement replacement = buildFromRequest(request, sale, admin);
        Replacement saved = replacementService.create(replacement, admin);
        return ResponseEntity.status(HttpStatus.CREATED).body(ReplacementResponse.from(saved));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Advance replacement status (APPROVED → DISPATCHED → RECEIVED)")
    public ResponseEntity<ReplacementResponse> updateStatus(@PathVariable Long id,
                                                            @RequestBody StatusRequest request,
                                                            @AuthenticationPrincipal Admin admin) {
        ReplacementStatus newStatus = ReplacementStatus.fromString(request.status());
        return ResponseEntity.ok(ReplacementResponse.from(
                replacementService.saveProgress(id, newStatus, admin)));
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "Complete replacement — deducts new stock, handles disposition, unlocks sale")
    public ResponseEntity<ReplacementResponse> complete(@PathVariable Long id,
                                                        @AuthenticationPrincipal Admin admin) {
        return ResponseEntity.ok(ReplacementResponse.from(replacementService.complete(id, admin)));
    }

    // ── Builder helper ────────────────────────────────────────────────────────

    private Replacement buildFromRequest(ReplacementRequest r, Sale sale, Admin admin) {
        Replacement rep = Replacement.builder()
                .sale(sale)
                .invoiceNumber(r.invoiceNumber() != null ? r.invoiceNumber() : sale.getInvoiceNumber())
                .dispositionOfOldItems(r.dispositionOfOldItems() != null ? DispositionOfItems.fromString(r.dispositionOfOldItems()) : null)
                .restockDestination(r.restockDestination())
                .newStockSource(r.newStockSource() != null ? FulfilmentSource.fromString(r.newStockSource()) : null)

                .newDeliveryCharge(r.newDeliveryCharge() != null ? r.newDeliveryCharge() : BigDecimal.ZERO)
                .newDiscount(r.newDiscount() != null ? r.newDiscount() : BigDecimal.ZERO)
                .newTotalAmount(r.newTotalAmount() != null ? r.newTotalAmount() : BigDecimal.ZERO)
                .createdByAdmin(admin)
                .updatedByAdmin(admin)
                .build();

        if (r.oldItems() != null) {
            for (var li : r.oldItems()) {
                Item item = li.itemId() != null ? itemRepository.findById(li.itemId()).orElse(null) : null;
                rep.getOldItems().add(ReplacementOldItem.builder()
                        .replacement(rep).item(item)
                        .itemName(li.itemName()).size(li.size())
                        .quantity(li.quantity()).build());
            }
        }
        if (r.newItems() != null) {
            for (var li : r.newItems()) {
                Item item = li.itemId() != null ? itemRepository.findById(li.itemId()).orElse(null) : null;
                rep.getNewItems().add(ReplacementNewItem.builder()
                        .replacement(rep).item(item)
                        .itemName(li.itemName()).size(li.size())
                        .quantity(li.quantity())
                        .priceEach(li.priceEach() != null ? li.priceEach() : BigDecimal.ZERO)
                        .totalPrice(li.totalPrice() != null ? li.totalPrice() : BigDecimal.ZERO)
                        .build());
            }
        }
        return rep;
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    record OldItemRequest(Long itemId, String itemName, String size, int quantity) {}
    record NewItemRequest(Long itemId, String itemName, String size, int quantity,
                          BigDecimal priceEach, BigDecimal totalPrice) {}

    record ReplacementRequest(Long saleId, String invoiceNumber,
                               String dispositionOfOldItems, String restockDestination,
                               String newStockSource,
                               BigDecimal newDeliveryCharge, BigDecimal newDiscount,
                               BigDecimal newTotalAmount,
                               List<OldItemRequest> oldItems,
                               List<NewItemRequest> newItems) {}

    record StatusRequest(String status) {}

    record OldItemResponse(Long id, Long itemId, String itemName, String size, int quantity) {
        static OldItemResponse from(ReplacementOldItem oi) {
            return new OldItemResponse(oi.getId(),
                    oi.getItem() != null ? oi.getItem().getId() : null,
                    oi.getItemName(), oi.getSize(), oi.getQuantity());
        }
    }

    record NewItemResponse(Long id, Long itemId, String itemName, String size, int quantity,
                           BigDecimal priceEach, BigDecimal totalPrice) {
        static NewItemResponse from(ReplacementNewItem ni) {
            return new NewItemResponse(ni.getId(),
                    ni.getItem() != null ? ni.getItem().getId() : null,
                    ni.getItemName(), ni.getSize(), ni.getQuantity(),
                    ni.getPriceEach(), ni.getTotalPrice());
        }
    }

    record ReplacementResponse(Long id, Long saleId, String invoiceNumber,
                                String invoiceStatus, String dispositionOfOldItems,
                                String restockDestination, String newStockSource,
                                BigDecimal newDeliveryCharge, BigDecimal newDiscount,
                                BigDecimal newTotalAmount, int version,
                                Instant createdAt, Instant updatedAt,
                                List<OldItemResponse> oldItems,
                                List<NewItemResponse> newItems) {
        static ReplacementResponse from(Replacement r) {
            return new ReplacementResponse(
                    r.getId(),
                    r.getSale() != null ? r.getSale().getId() : null,
                    r.getInvoiceNumber(), r.getInvoiceStatus().name(),
                    r.getDispositionOfOldItems() != null ? r.getDispositionOfOldItems().name() : null,
                    r.getRestockDestination(),
                    r.getNewStockSource() != null ? r.getNewStockSource().name() : null,
                    r.getNewDeliveryCharge(), r.getNewDiscount(), r.getNewTotalAmount(),
                    r.getVersion() != null ? r.getVersion() : 1,
                    r.getCreatedAt(), r.getUpdatedAt(),
                    r.getOldItems().stream().map(OldItemResponse::from).toList(),
                    r.getNewItems().stream().map(NewItemResponse::from).toList());
        }
    }
}
