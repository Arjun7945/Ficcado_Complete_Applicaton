package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.Sale;
import com.aps.ficcado_inventory_sales_management_app.entity.SaleLineItem;
import com.aps.ficcado_inventory_sales_management_app.entity.Item;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.*;
import com.aps.ficcado_inventory_sales_management_app.repository.ItemRepository;
import com.aps.ficcado_inventory_sales_management_app.service.AuthService;
import com.aps.ficcado_inventory_sales_management_app.service.SaleService;
import com.aps.ficcado_inventory_sales_management_app.service.SalesLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/sales")
@Tag(name = "Sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService saleService;
    private final ItemRepository itemRepository;
    private final SalesLogService salesLogService;
    private final AuthService authService;

    @GetMapping
    @Operation(summary = "List all sales (supports optional keyset pagination)")
    public List<SaleResponse> getAll(
            @RequestParam(required = false) Long lastSeenId,
            @RequestParam(defaultValue = "50") int pageSize) {
        if (lastSeenId != null) {
            return saleService.getPageBefore(lastSeenId, Math.min(pageSize, 100))
                    .stream().map(SaleResponse::from).toList();
        }
        return saleService.getAll().stream().map(SaleResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get sale by ID with IDOR ownership validation")
    public ResponseEntity<SaleResponse> getById(@PathVariable Long id,
                                                @AuthenticationPrincipal Admin admin) {
        return saleService.findById(id)
                .map(sale -> {
                    // IDOR guard: field handlers can only inspect sales assigned to them unless SUPERADMIN/ADMIN
                    if (admin != null && !authService.hasRole(admin, AdminRole.SUPERADMIN)
                            && sale.getSaleClosedByAdmin() != null
                            && !sale.getSaleClosedByAdmin().getId().equals(admin.getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<SaleResponse>build();
                    }
                    return ResponseEntity.ok(SaleResponse.from(sale));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-invoice/{invoiceNumber}")
    @Operation(summary = "Get sale by invoice number")
    public ResponseEntity<SaleResponse> getByInvoice(@PathVariable String invoiceNumber) {
        return saleService.findByInvoiceNumber(invoiceNumber)
                .map(SaleResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    @Operation(summary = "Search sales by invoice, customer name, or phone number")
    public List<SaleResponse> search(@RequestParam String q) {
        return saleService.search(q).stream().map(SaleResponse::from).toList();
    }

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
    @PostMapping
    @Operation(summary = "Create a new sale")
    public ResponseEntity<SaleResponse> create(@RequestBody SaleRequest request,
                                               @AuthenticationPrincipal Admin admin) {
        Sale sale = buildSaleFromRequest(request, admin);
        Sale saved = saleService.createSale(sale, admin);
        return ResponseEntity.status(HttpStatus.CREATED).body(SaleResponse.from(saved));
    }

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
    @PutMapping("/{id}")
    @Operation(summary = "Update sale (only allowed if not locked)")
    public ResponseEntity<SaleResponse> update(@PathVariable Long id,
                                               @RequestBody SaleRequest request,
                                               @AuthenticationPrincipal Admin admin) {
        Sale sale = buildSaleFromRequest(request, admin);
        sale.setId(id);
        Sale saved = saleService.updateSale(sale, admin);
        return ResponseEntity.ok(SaleResponse.from(saved));
    }

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
    @PostMapping("/{id}/request-replacement")
    @Operation(summary = "Request replacement — locks the sale")
    public ResponseEntity<SaleResponse> requestReplacement(@PathVariable Long id,
                                                           @AuthenticationPrincipal Admin admin) {
        return ResponseEntity.ok(SaleResponse.from(saleService.requestReplacement(id, admin)));
    }

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
    @PostMapping("/{id}/request-refund")
    @Operation(summary = "Request return/refund — locks the sale")
    public ResponseEntity<SaleResponse> requestRefund(@PathVariable Long id,
                                                      @AuthenticationPrincipal Admin admin) {
        return ResponseEntity.ok(SaleResponse.from(saleService.requestRefund(id, admin)));
    }

    @GetMapping("/{id}/sales-log")
    @Operation(summary = "Get narrative audit log for a sale by ID")
    public ResponseEntity<?> getSalesLog(@PathVariable Long id) {
        return saleService.findById(id).map(sale ->
                ResponseEntity.ok(salesLogService.getByInvoice(sale.getInvoiceNumber()))
        ).orElse(ResponseEntity.notFound().build());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Sale buildSaleFromRequest(SaleRequest r, Admin admin) {
        Sale sale = Sale.builder()
                .invoiceNumber(r.invoiceNumber())
                .customerName(r.customerName())
                .customerPhoneNumber(r.customerPhoneNumber())
                .customerAddress(r.customerAddress())
                .customerEmail(r.customerEmail())
                .saleStatus(SaleStatus.fromString(r.saleStatus()))
                .paymentStatus(PaymentStatus.fromString(r.paymentStatus()))
                .modeOfPayment(r.modeOfPayment())
                .transactionId(r.transactionId())
                .deliveryStatus(DeliveryStatus.fromString(r.deliveryStatus()))
                .deliveryChargeEnabled(Boolean.TRUE.equals(r.deliveryChargeEnabled()))
                .deliveryChargeAmount(r.deliveryChargeAmount() != null ? r.deliveryChargeAmount() : BigDecimal.ZERO)
                .fulfilmentSource(r.fulfilmentSource() != null ? FulfilmentSource.fromString(r.fulfilmentSource()) : null)

                .discount(r.discount() != null ? r.discount() : BigDecimal.ZERO)
                .totalAmount(r.totalAmount() != null ? r.totalAmount() : BigDecimal.ZERO)
                .receivedBy(r.receivedBy())
                .remarks(r.remarks())
                .createdByAdmin(admin)
                .updatedByAdmin(admin)
                .build();

        if (r.saleClosedByAdminId() != null) {
            Admin closer = new Admin();
            closer.setId(r.saleClosedByAdminId());
            sale.setSaleClosedByAdmin(closer);
        }

        if (r.lineItems() != null) {
            for (LineItemRequest li : r.lineItems()) {
                Item item = li.itemId() != null ? itemRepository.findById(li.itemId()).orElse(null) : null;
                SaleLineItem lineItem = SaleLineItem.builder()
                        .sale(sale)
                        .item(item)
                        .itemName(li.itemName())
                        .size(li.size())
                        .quantity(li.quantity())
                        .priceEach(li.priceEach() != null ? li.priceEach() : BigDecimal.ZERO)
                        .totalPrice(li.totalPrice() != null ? li.totalPrice() : BigDecimal.ZERO)
                        .build();
                sale.getLineItems().add(lineItem);
            }
        }

        return sale;
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    record LineItemRequest(Long itemId, String itemName, String size,
                           int quantity, BigDecimal priceEach, BigDecimal totalPrice) {}

    record SaleRequest(String invoiceNumber, String customerName, String customerPhoneNumber,
                       String customerAddress, String customerEmail,
                       String saleStatus, String paymentStatus, String modeOfPayment,
                       String transactionId, String deliveryStatus,
                       Boolean deliveryChargeEnabled, BigDecimal deliveryChargeAmount,
                       String fulfilmentSource, Long saleClosedByAdminId,
                       BigDecimal discount, BigDecimal totalAmount,
                       String receivedBy, String remarks,
                       List<LineItemRequest> lineItems) {}

    record LineItemResponse(Long id, Long itemId, String itemName, String size,
                            int quantity, BigDecimal priceEach, BigDecimal totalPrice) {
        static LineItemResponse from(SaleLineItem li) {
            return new LineItemResponse(li.getId(),
                    li.getItem() != null ? li.getItem().getId() : null,
                    li.getItemName(), li.getSize(), li.getQuantity(),
                    li.getPriceEach(), li.getTotalPrice());
        }
    }

    record SaleResponse(Long id, String invoiceNumber, Long customerId,
                        String customerName, String customerPhoneNumber,
                        String customerAddress, String customerEmail,
                        String saleStatus, String paymentStatus,
                        String modeOfPayment, String transactionId,
                        String deliveryStatus, boolean deliveryChargeEnabled,
                        BigDecimal deliveryChargeAmount, String fulfilmentSource,
                        BigDecimal discount, BigDecimal totalAmount,
                        Long saleClosedByAdminId, String saleClosedByAdminName,
                        String receivedBy, String remarks,
                        int version, Instant createdAt, Instant updatedAt,
                        List<LineItemResponse> lineItems) {

        static SaleResponse from(Sale s) {
            return new SaleResponse(
                    s.getId(), s.getInvoiceNumber(),
                    s.getCustomer() != null ? s.getCustomer().getId() : null,
                    s.getCustomerName(), s.getCustomerPhoneNumber(),
                    s.getCustomerAddress(), s.getCustomerEmail(),
                    s.getSaleStatus().name(), s.getPaymentStatus().name(),
                    s.getModeOfPayment(), s.getTransactionId(),
                    s.getDeliveryStatus().name(),
                    Boolean.TRUE.equals(s.getDeliveryChargeEnabled()),
                    s.getDeliveryChargeAmount(),
                    s.getFulfilmentSource() != null ? s.getFulfilmentSource().name() : null,
                    s.getDiscount(), s.getTotalAmount(),
                    s.getSaleClosedByAdmin() != null ? s.getSaleClosedByAdmin().getId() : null,
                    s.getSaleClosedByAdmin() != null ? s.getSaleClosedByAdmin().getAdminName() : null,
                    s.getReceivedBy(), s.getRemarks(),
                    s.getVersion() != null ? s.getVersion() : 1,
                    s.getCreatedAt(), s.getUpdatedAt(),
                    s.getLineItems().stream().map(LineItemResponse::from).toList());
        }
    }
}
