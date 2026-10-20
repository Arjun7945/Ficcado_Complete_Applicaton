package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.SaleDto;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.entity.SaleLineItem;
import com.aps.ficcado_crm_backend.mapper.SaleMapper;
import com.aps.ficcado_crm_backend.repository.AdminRepository;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.service.SaleService;
import com.aps.ficcado_crm_backend.service.SalesLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@Validated
@RestController
@RequestMapping("/api/sales")
@Tag(name = "Sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService saleService;
    private final ItemRepository itemRepository;
    private final AdminRepository adminRepository;
    private final SalesLogService salesLogService;

    @GetMapping
    @Operation(summary = "List all sales (supports optional keyset pagination)")
    public List<SaleDto.SaleResponse> getAll(
            @RequestParam(required = false) Long lastSeenId,
            @RequestParam(defaultValue = "50") int pageSize) {
        log.info("REST request to list sales (lastSeenId={}, pageSize={})", lastSeenId, pageSize);
        if (lastSeenId != null) {
            return saleService.getPageBefore(lastSeenId, Math.min(pageSize, 100))
                    .stream().map(SaleMapper::toResponse).toList();
        }
        return saleService.getAll().stream().map(SaleMapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get sale by ID")
    public ResponseEntity<SaleDto.SaleResponse> getById(@PathVariable Long id) {
        log.info("REST request to get sale [id={}]", id);
        return saleService.findById(id)
                .map(SaleMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-invoice/{invoiceNumber}")
    @Operation(summary = "Get sale by invoice number")
    public ResponseEntity<SaleDto.SaleResponse> getByInvoice(@PathVariable String invoiceNumber) {
        log.info("REST request to get sale by invoice [{}]", invoiceNumber);
        return saleService.findByInvoiceNumber(invoiceNumber)
                .map(SaleMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    @Operation(summary = "Search sales by invoice, customer name, or phone number")
    public List<SaleDto.SaleResponse> search(@RequestParam String q) {
        log.info("REST request to search sales with query [{}]", q);
        return saleService.search(q).stream().map(SaleMapper::toResponse).toList();
    }

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
    @PostMapping
    @Operation(summary = "Create a new sale")
    public ResponseEntity<SaleDto.SaleResponse> create(@Valid @RequestBody SaleDto.SaleRequest request,
                                                       @AuthenticationPrincipal Admin admin) {
        log.info("REST request to create sale [invoice={}]", request.invoiceNumber());
        Sale sale = SaleMapper.toEntity(request, admin, itemRepository, adminRepository);
        Sale saved = saleService.createSale(sale, admin);
        return ResponseEntity.status(HttpStatus.CREATED).body(SaleMapper.toResponse(saved));
    }

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
    @PutMapping("/{id}")
    @Operation(summary = "Update sale (only allowed if not locked)")
    public ResponseEntity<SaleDto.SaleResponse> update(@PathVariable Long id,
                                                       @Valid @RequestBody SaleDto.SaleRequest request,
                                                       @AuthenticationPrincipal Admin admin) {
        log.info("REST request to update sale [id={}]", id);
        Sale incoming = SaleMapper.toEntity(request, admin, itemRepository, adminRepository);
        Sale saved = saleService.updateSale(id, incoming, admin);
        return ResponseEntity.ok(SaleMapper.toResponse(saved));
    }

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
    @PostMapping("/{id}/add-items")
    @Operation(summary = "Add items to existing sale and deduct stock")
    public ResponseEntity<SaleDto.SaleResponse> addItems(@PathVariable Long id,
                                                         @Valid @RequestBody SaleDto.AddItemsRequest request,
                                                         @AuthenticationPrincipal Admin admin) {
        log.info("REST request to add items to sale [id={}]", id);
        List<SaleDto.LineItemRequest> list = request.items() != null ? request.items() : request.lineItems();
        List<SaleLineItem> itemsToAdd = list != null
                ? list.stream().map(li -> SaleMapper.toLineItemEntity(li, null, itemRepository)).toList()
                : List.of();
        Sale saved = saleService.addItemsToSale(id, itemsToAdd, admin);
        return ResponseEntity.ok(SaleMapper.toResponse(saved));
    }

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
    @PostMapping("/{id}/request-replacement")
    @Operation(summary = "Request replacement — locks the sale")
    public ResponseEntity<SaleDto.SaleResponse> requestReplacement(@PathVariable Long id,
                                                                   @AuthenticationPrincipal Admin admin) {
        log.info("REST request to mark replacement on sale [id={}]", id);
        return ResponseEntity.ok(SaleMapper.toResponse(saleService.requestReplacement(id, admin)));
    }

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
    @PostMapping("/{id}/request-refund")
    @Operation(summary = "Request return/refund — locks the sale")
    public ResponseEntity<SaleDto.SaleResponse> requestRefund(@PathVariable Long id,
                                                              @AuthenticationPrincipal Admin admin) {
        log.info("REST request to mark return/refund on sale [id={}]", id);
        return ResponseEntity.ok(SaleMapper.toResponse(saleService.requestRefund(id, admin)));
    }

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
    @PostMapping("/{id}/complete")
    @Operation(summary = "Mark sale as completed and record closed-by admin")
    public ResponseEntity<SaleDto.SaleResponse> completeSale(@PathVariable Long id,
                                                             @Valid @RequestBody(required = false) SaleDto.CompleteSaleRequest request,
                                                             @AuthenticationPrincipal Admin admin) {
        log.info("REST request to complete sale [id={}]", id);
        String payStatus = request != null ? request.paymentStatus() : null;
        String payMode = request != null ? request.modeOfPayment() : null;
        String txId = request != null ? request.transactionId() : null;
        String delivStatus = request != null ? request.deliveryStatus() : null;
        String receivedBy = request != null ? request.receivedBy() : null;
        String remarks = request != null ? request.remarks() : null;

        Sale completed = saleService.markSaleCompleted(
                id, payStatus, payMode, txId, delivStatus, receivedBy, remarks, admin);
        return ResponseEntity.ok(SaleMapper.toResponse(completed));
    }

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
    @PostMapping("/by-invoice/{invoiceNumber}/complete")
    @Operation(summary = "Mark sale as completed by invoice number and record closed-by admin")
    public ResponseEntity<SaleDto.SaleResponse> completeSaleByInvoice(@PathVariable String invoiceNumber,
                                                                      @Valid @RequestBody(required = false) SaleDto.CompleteSaleRequest request,
                                                                      @AuthenticationPrincipal Admin admin) {
        log.info("REST request to complete sale by invoice [{}]", invoiceNumber);
        Sale sale = saleService.findByInvoiceNumber(invoiceNumber)
                .orElseThrow(() -> new IllegalArgumentException("Sale not found with invoice: " + invoiceNumber));
        return completeSale(sale.getId(), request, admin);
    }

    @GetMapping("/{id}/sales-log")
    @Operation(summary = "Get narrative audit log for a sale by ID")
    public ResponseEntity<?> getSalesLog(@PathVariable Long id) {
        log.info("REST request to get narrative sales log for sale [id={}]", id);
        return saleService.findById(id).map(sale ->
                ResponseEntity.ok(salesLogService.getByInvoice(sale.getInvoiceNumber()))
        ).orElse(ResponseEntity.notFound().build());
    }
}
