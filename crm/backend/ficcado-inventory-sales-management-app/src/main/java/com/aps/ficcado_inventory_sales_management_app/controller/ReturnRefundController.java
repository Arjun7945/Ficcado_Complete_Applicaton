package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.*;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.*;
import com.aps.ficcado_inventory_sales_management_app.repository.ItemRepository;
import com.aps.ficcado_inventory_sales_management_app.repository.SaleRepository;
import com.aps.ficcado_inventory_sales_management_app.service.ReturnRefundService;
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
@RequestMapping("/api/return-refunds")
@Tag(name = "Return & Refunds")
@RequiredArgsConstructor
public class ReturnRefundController {

    private final ReturnRefundService returnRefundService;
    private final SaleRepository saleRepository;
    private final ItemRepository itemRepository;

    @GetMapping
    @Operation(summary = "List all return/refund tickets")
    public List<ReturnRefundResponse> getAll() {
        return returnRefundService.getAll().stream().map(ReturnRefundResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get return/refund ticket by ID")
    public ResponseEntity<ReturnRefundResponse> getById(@PathVariable Long id) {
        return returnRefundService.findById(id)
                .map(ReturnRefundResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Open a return/refund ticket for a locked sale")
    public ResponseEntity<ReturnRefundResponse> create(@RequestBody ReturnRefundRequest request,
                                                       @AuthenticationPrincipal Admin admin) {
        Sale sale = saleRepository.findById(request.saleId())
                .orElseThrow(() -> new IllegalArgumentException("Sale not found: " + request.saleId()));

        ReturnRefund rr = buildFromRequest(request, sale, admin);
        ReturnRefund saved = returnRefundService.create(rr, admin);
        return ResponseEntity.status(HttpStatus.CREATED).body(ReturnRefundResponse.from(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update ticket fields (verification status, refund amount, disposition, etc.)")
    public ResponseEntity<ReturnRefundResponse> update(@PathVariable Long id,
                                                       @RequestBody ReturnRefundUpdateRequest request,
                                                       @AuthenticationPrincipal Admin admin) {
        return returnRefundService.findById(id).map(rr -> {
            if (request.itemVerificationStatus() != null)
                rr.setItemVerificationStatus(ItemVerificationStatus.fromString(request.itemVerificationStatus()));
            if (request.refundStatus() != null)
                rr.setRefundStatus(RefundStatus.fromString(request.refundStatus()));
            if (request.refundAmount() != null)
                rr.setRefundAmount(request.refundAmount());
            if (request.transactionId() != null)
                rr.setTransactionId(request.transactionId());
            if (request.modeOfRefund() != null)
                rr.setModeOfRefund(request.modeOfRefund());
            if (request.dispositionOfReturnedItems() != null)
                rr.setDispositionOfReturnedItems(
                        DispositionOfItems.fromString(request.dispositionOfReturnedItems()));

            if (request.restockDestination() != null)
                rr.setRestockDestination(request.restockDestination());
            if (request.priceChargedReturnedItems() != null)
                rr.setPriceChargedReturnedItems(request.priceChargedReturnedItems());
            if (request.newDiscountApplied() != null)
                rr.setNewDiscountApplied(request.newDiscountApplied());
            if (request.reasonForReturn() != null)
                rr.setReasonForReturn(request.reasonForReturn());
            if (request.refundCompletedDateTime() != null)
                rr.setRefundCompletedDateTime(request.refundCompletedDateTime());
            if (Boolean.TRUE.equals(request.markRefundCompleted()))
                rr.setRefundStatus(RefundStatus.COMPLETED);
            rr.setUpdatedByAdmin(admin);

            // Use save-progress to persist non-close updates
            return ResponseEntity.ok(ReturnRefundResponse.from(
                    returnRefundService.saveProgress(id, rr.getRefundStatus(), admin)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/close-ticket")
    @Operation(summary = "Close ticket — enforces validation gate, handles disposition, unlocks sale")
    public ResponseEntity<ReturnRefundResponse> closeTicket(@PathVariable Long id,
                                                            @AuthenticationPrincipal Admin admin) {
        return ResponseEntity.ok(ReturnRefundResponse.from(returnRefundService.closeTicket(id, admin)));
    }

    // ── Builder helper ────────────────────────────────────────────────────────

    private ReturnRefund buildFromRequest(ReturnRefundRequest r, Sale sale, Admin admin) {
        ReturnRefund rr = ReturnRefund.builder()
                .sale(sale)
                .invoiceNumber(r.invoiceNumber() != null ? r.invoiceNumber() : sale.getInvoiceNumber())
                .reasonForReturn(r.reasonForReturn())
                .createdByAdmin(admin)
                .updatedByAdmin(admin)
                .build();

        if (r.returnedItems() != null) {
            for (var li : r.returnedItems()) {
                Item item = li.itemId() != null ? itemRepository.findById(li.itemId()).orElse(null) : null;
                rr.getReturnedItems().add(ReturnRefundItem.builder()
                        .returnRefund(rr).item(item)
                        .itemName(li.itemName()).size(li.size())
                        .quantity(li.quantity())
                        .priceEach(li.priceEach() != null ? li.priceEach() : BigDecimal.ZERO)
                        .totalPrice(li.totalPrice() != null ? li.totalPrice() : BigDecimal.ZERO)
                        .build());
            }
        }
        return rr;
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    record ReturnedItemRequest(Long itemId, String itemName, String size, int quantity,
                                BigDecimal priceEach, BigDecimal totalPrice) {}

    record ReturnRefundRequest(Long saleId, String invoiceNumber,
                                String reasonForReturn,
                                List<ReturnedItemRequest> returnedItems) {}

    record ReturnRefundUpdateRequest(String itemVerificationStatus, String refundStatus,
                                     BigDecimal refundAmount, Instant refundCompletedDateTime,
                                     String transactionId, String modeOfRefund,
                                     String dispositionOfReturnedItems, String restockDestination,
                                     BigDecimal priceChargedReturnedItems,
                                     BigDecimal newDiscountApplied, String reasonForReturn,
                                     Boolean markRefundCompleted) {}

    record ReturnedItemResponse(Long id, Long itemId, String itemName, String size,
                                 int quantity, BigDecimal priceEach, BigDecimal totalPrice) {
        static ReturnedItemResponse from(ReturnRefundItem item) {
            return new ReturnedItemResponse(item.getId(),
                    item.getItem() != null ? item.getItem().getId() : null,
                    item.getItemName(), item.getSize(), item.getQuantity(),
                    item.getPriceEach(), item.getTotalPrice());
        }
    }

    record ReturnRefundResponse(Long id, Long saleId, String invoiceNumber,
                                 String itemVerificationStatus, String refundStatus,
                                 BigDecimal refundAmount, Instant refundCompletedDateTime,
                                 String transactionId, String modeOfRefund,
                                 String dispositionOfReturnedItems, String restockDestination,
                                 BigDecimal priceChargedReturnedItems,
                                 BigDecimal newDiscountApplied, String reasonForReturn,
                                 Long closedByAdminId, String closedByAdminName,
                                 int version, Instant createdAt, Instant updatedAt,
                                 List<ReturnedItemResponse> returnedItems) {
        static ReturnRefundResponse from(ReturnRefund rr) {
            return new ReturnRefundResponse(
                    rr.getId(),
                    rr.getSale() != null ? rr.getSale().getId() : null,
                    rr.getInvoiceNumber(),
                    rr.getItemVerificationStatus() != null ? rr.getItemVerificationStatus().name() : null,
                    rr.getRefundStatus().name(),
                    rr.getRefundAmount(), rr.getRefundCompletedDateTime(),
                    rr.getTransactionId(), rr.getModeOfRefund(),
                    rr.getDispositionOfReturnedItems() != null ? rr.getDispositionOfReturnedItems().name() : null,
                    rr.getRestockDestination(),
                    rr.getPriceChargedReturnedItems(), rr.getNewDiscountApplied(),
                    rr.getReasonForReturn(),
                    rr.getClosedByAdmin() != null ? rr.getClosedByAdmin().getId() : null,
                    rr.getClosedByAdmin() != null ? rr.getClosedByAdmin().getAdminName() : null,
                    rr.getVersion() != null ? rr.getVersion() : 1,
                    rr.getCreatedAt(), rr.getUpdatedAt(),
                    rr.getReturnedItems().stream().map(ReturnedItemResponse::from).toList());
        }
    }
}
