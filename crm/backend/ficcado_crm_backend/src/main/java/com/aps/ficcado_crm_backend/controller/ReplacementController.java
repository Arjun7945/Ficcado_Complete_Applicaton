package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.ReplacementDto;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Replacement;
import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.entity.enums.ReplacementStatus;
import com.aps.ficcado_crm_backend.mapper.ReplacementMapper;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.service.ReplacementService;
import com.aps.ficcado_crm_backend.service.SaleService;
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
@RequestMapping("/api/replacements")
@Tag(name = "Replacements")
@RequiredArgsConstructor
public class ReplacementController {

    private final ReplacementService replacementService;
    private final SaleService saleService;
    private final ItemRepository itemRepository;

    @GetMapping
    @Operation(summary = "List all replacements")
    public List<ReplacementDto.ReplacementResponse> getAll() {
        log.debug("GET /api/replacements - fetching all replacements");
        return replacementService.getAll().stream().map(ReplacementMapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get replacement by ID")
    public ResponseEntity<ReplacementDto.ReplacementResponse> getById(@PathVariable Long id) {
        log.debug("GET /api/replacements/{} - fetching replacement", id);
        return replacementService.findById(id)
                .map(ReplacementMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-invoice/{invoiceNumber}")
    @Operation(summary = "Get replacement by invoice number")
    public ResponseEntity<ReplacementDto.ReplacementResponse> getByInvoiceNumber(@PathVariable String invoiceNumber) {
        log.debug("GET /api/replacements/by-invoice/{} - fetching replacement", invoiceNumber);
        return replacementService.findByInvoiceNumber(invoiceNumber)
                .map(ReplacementMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create replacement request from a locked sale")
    public ResponseEntity<ReplacementDto.ReplacementResponse> create(@Valid @RequestBody ReplacementDto.ReplacementRequest request,
                                                        @AuthenticationPrincipal Admin admin) {
        log.info("POST /api/replacements - creating replacement for sale ID {} by admin {}",
                request.saleId(), admin != null ? admin.getAdminName() : "system");
        Sale sale = saleService.findById(request.saleId())
                .orElseThrow(() -> new IllegalArgumentException("Sale not found: " + request.saleId()));

        Replacement replacement = ReplacementMapper.toEntity(request, sale, admin, itemRepository);
        Replacement saved = replacementService.create(replacement, admin);
        return ResponseEntity.status(HttpStatus.CREATED).body(ReplacementMapper.toResponse(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update replacement draft and totals")
    public ResponseEntity<ReplacementDto.ReplacementResponse> update(@PathVariable Long id,
                                                      @Valid @RequestBody ReplacementDto.ReplacementUpdateRequest request,
                                                      @AuthenticationPrincipal Admin admin) {
        log.info("PUT /api/replacements/{} - updating replacement by admin {}",
                id, admin != null ? admin.getAdminName() : "system");
        Replacement saved = replacementService.updateReplacement(id, request, admin);
        return ResponseEntity.ok(ReplacementMapper.toResponse(saved));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Advance replacement status (APPROVED → DISPATCHED → RECEIVED)")
    public ResponseEntity<ReplacementDto.ReplacementResponse> updateStatus(@PathVariable Long id,
                                                            @Valid @RequestBody ReplacementDto.StatusRequest request,
                                                            @AuthenticationPrincipal Admin admin) {
        log.info("PUT /api/replacements/{}/status - advancing status to {} by admin {}",
                id, request.status(), admin != null ? admin.getAdminName() : "system");
        ReplacementStatus newStatus = ReplacementStatus.fromString(request.status());
        return ResponseEntity.ok(ReplacementMapper.toResponse(
                replacementService.saveProgress(id, newStatus, admin)));
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "Complete replacement — deducts new stock, handles disposition, unlocks sale")
    public ResponseEntity<ReplacementDto.ReplacementResponse> complete(@PathVariable Long id,
                                                        @AuthenticationPrincipal Admin admin) {
        log.info("POST /api/replacements/{}/complete - completing replacement by admin {}",
                id, admin != null ? admin.getAdminName() : "system");
        return ResponseEntity.ok(ReplacementMapper.toResponse(replacementService.complete(id, admin)));
    }
}

