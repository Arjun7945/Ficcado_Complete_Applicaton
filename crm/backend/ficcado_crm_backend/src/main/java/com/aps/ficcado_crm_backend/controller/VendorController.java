package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.VendorDto.PaymentRequest;
import com.aps.ficcado_crm_backend.dto.VendorDto.PaymentResponse;
import com.aps.ficcado_crm_backend.dto.VendorDto.VendorRequest;
import com.aps.ficcado_crm_backend.dto.VendorDto.VendorResponse;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Vendor;
import com.aps.ficcado_crm_backend.entity.VendorPayment;
import com.aps.ficcado_crm_backend.mapper.VendorMapper;
import com.aps.ficcado_crm_backend.service.VendorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@org.springframework.validation.annotation.Validated
@RestController
@RequestMapping("/api/vendors")
@Tag(name = "Vendors")
@PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
@RequiredArgsConstructor
public class VendorController {

    private final VendorService vendorService;

    // ── Vendors ───────────────────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "List all vendors with contact numbers")
    public List<VendorResponse> getAll() {
        log.debug("GET /api/vendors - listing all vendors");
        return vendorService.getAllWithContactNumbers().stream()
                .map(VendorMapper::toResponse)
                .toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get vendor by ID")
    public ResponseEntity<VendorResponse> getById(@PathVariable Long id) {
        log.debug("GET /api/vendors/{} - getting vendor by id", id);
        return vendorService.getById(id)
                .map(VendorMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }


    @PostMapping
    @Operation(summary = "Create vendor")
    public ResponseEntity<VendorResponse> create(@Valid @RequestBody VendorRequest request,
                                                 @AuthenticationPrincipal Admin admin) {
        log.info("Creating vendor: {}", request.vendorName());
        Vendor saved = vendorService.createVendor(
                request.vendorName(),
                request.vendorType(),
                request.customVendorType(),
                request.emailId(),
                request.purposeUse(),
                request.contactNumbers(),
                admin
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(VendorMapper.toResponse(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update vendor")
    public ResponseEntity<VendorResponse> update(@PathVariable Long id,
                                                 @Valid @RequestBody VendorRequest request,
                                                 @AuthenticationPrincipal Admin admin) {
        log.info("Updating vendor [id={}]", id);
        return vendorService.updateVendor(
                id,
                request.vendorName(),
                request.vendorType(),
                request.customVendorType(),
                request.emailId(),
                request.purposeUse(),
                request.contactNumbers(),
                admin
        ).map(VendorMapper::toResponse)
         .map(ResponseEntity::ok)
         .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete vendor")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal Admin admin) {
        log.info("Deleting vendor [id={}]", id);
        boolean deleted = vendorService.deleteVendor(id, admin);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    // ── Vendor Payments ───────────────────────────────────────────────────────

    @GetMapping("/{vendorId}/payments")
    @Operation(summary = "List payments for a vendor")
    public List<PaymentResponse> getPayments(@PathVariable Long vendorId) {
        log.debug("GET /api/vendors/{}/payments - listing payments for vendor", vendorId);
        return vendorService.getPayments(vendorId)
                .stream()
                .map(VendorMapper::toPaymentResponse)
                .toList();
    }


    @PostMapping("/{vendorId}/payments")
    @Operation(summary = "Record a payment to a vendor")
    public ResponseEntity<PaymentResponse> addPayment(@PathVariable Long vendorId,
                                                      @Valid @RequestBody PaymentRequest request,
                                                      @AuthenticationPrincipal Admin admin) {
        log.info("Recording payment of {} to vendor [id={}]", request.amount(), vendorId);
        VendorPayment saved = vendorService.addPayment(
                vendorId,
                request.amount(),
                request.paymentDate(),
                request.note(),
                admin
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(VendorMapper.toPaymentResponse(saved));
    }
}
