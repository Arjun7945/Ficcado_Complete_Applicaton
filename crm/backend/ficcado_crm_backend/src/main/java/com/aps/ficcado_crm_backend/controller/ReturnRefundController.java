package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.ReturnRefundDto;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.ReturnRefund;
import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.mapper.ReturnRefundMapper;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.repository.SaleRepository;
import com.aps.ficcado_crm_backend.service.ReturnRefundService;
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
@RequestMapping("/api/return-refunds")
@Tag(name = "Return & Refunds")
@RequiredArgsConstructor
public class ReturnRefundController {

    private final ReturnRefundService returnRefundService;
    private final SaleRepository saleRepository;
    private final ItemRepository itemRepository;

    @GetMapping
    @Operation(summary = "List all return/refund tickets")
    public List<ReturnRefundDto.ReturnRefundResponse> getAll() {
        log.info("REST request to list all return/refund tickets");
        return returnRefundService.getAll().stream().map(ReturnRefundMapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get return/refund ticket by ID")
    public ResponseEntity<ReturnRefundDto.ReturnRefundResponse> getById(@PathVariable Long id) {
        log.info("REST request to get return/refund ticket [id={}]", id);
        return returnRefundService.findById(id)
                .map(ReturnRefundMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-invoice/{invoiceNumber}")
    @Operation(summary = "Get return/refund ticket by invoice number")
    public ResponseEntity<ReturnRefundDto.ReturnRefundResponse> getByInvoiceNumber(@PathVariable String invoiceNumber) {
        log.info("REST request to get return/refund ticket by invoice [{}]", invoiceNumber);
        return returnRefundService.findByInvoiceNumber(invoiceNumber)
                .map(ReturnRefundMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Open a return/refund ticket for a locked sale")
    public ResponseEntity<ReturnRefundDto.ReturnRefundResponse> create(@Valid @RequestBody ReturnRefundDto.ReturnRefundRequest request,
                                                                       @AuthenticationPrincipal Admin admin) {
        log.info("REST request to create return/refund ticket for sale [id={}, invoice={}]",
                request.saleId(), request.invoiceNumber());
        Sale sale = saleRepository.findById(request.saleId())
                .orElseThrow(() -> new IllegalArgumentException("Sale not found: " + request.saleId()));

        ReturnRefund rr = ReturnRefundMapper.toEntity(request, sale, admin, itemRepository);
        ReturnRefund saved = returnRefundService.create(rr, admin);
        return ResponseEntity.status(HttpStatus.CREATED).body(ReturnRefundMapper.toResponse(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update ticket fields (verification status, refund amount, disposition, etc.)")
    public ResponseEntity<ReturnRefundDto.ReturnRefundResponse> update(@PathVariable Long id,
                                                                       @Valid @RequestBody ReturnRefundDto.ReturnRefundUpdateRequest request,
                                                                       @AuthenticationPrincipal Admin admin) {
        log.info("REST request to update return/refund ticket [id={}]", id);
        return returnRefundService.findById(id).map(existing -> {
            ReturnRefund patch = new ReturnRefund();
            ReturnRefundMapper.applyUpdatePatch(patch, request);
            ReturnRefund saved = returnRefundService.updateTicket(id, patch, admin);
            return ResponseEntity.ok(ReturnRefundMapper.toResponse(saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/close-ticket")
    @Operation(summary = "Close ticket — enforces validation gate, handles disposition, unlocks sale")
    public ResponseEntity<ReturnRefundDto.ReturnRefundResponse> closeTicket(@PathVariable Long id,
                                                                            @AuthenticationPrincipal Admin admin) {
        log.info("REST request to close return/refund ticket [id={}]", id);
        return ResponseEntity.ok(ReturnRefundMapper.toResponse(returnRefundService.closeTicket(id, admin)));
    }
}
