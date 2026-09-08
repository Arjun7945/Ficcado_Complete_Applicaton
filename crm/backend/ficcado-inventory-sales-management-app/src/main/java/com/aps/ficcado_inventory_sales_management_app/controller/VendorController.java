package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.Vendor;
import com.aps.ficcado_inventory_sales_management_app.entity.VendorContactNumber;
import com.aps.ficcado_inventory_sales_management_app.entity.VendorPayment;
import com.aps.ficcado_inventory_sales_management_app.service.VendorService;
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
import java.time.LocalDate;
import java.util.List;

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
        return vendorService.getAllWithContactNumbers().stream().map(VendorResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get vendor by ID")
    public ResponseEntity<VendorResponse> getById(@PathVariable Long id) {
        return vendorService.getById(id)
                .map(VendorResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create vendor")
    public ResponseEntity<VendorResponse> create(@RequestBody VendorRequest request,
                                                 @AuthenticationPrincipal Admin admin) {
        Vendor saved = vendorService.createVendor(
                request.vendorName(),
                request.vendorType(),
                request.customVendorType(),
                request.emailId(),
                request.purposeUse(),
                request.contactNumbers(),
                admin
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(VendorResponse.from(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update vendor")
    public ResponseEntity<VendorResponse> update(@PathVariable Long id,
                                                 @RequestBody VendorRequest request,
                                                 @AuthenticationPrincipal Admin admin) {
        return vendorService.updateVendor(
                id,
                request.vendorName(),
                request.vendorType(),
                request.customVendorType(),
                request.emailId(),
                request.purposeUse(),
                request.contactNumbers(),
                admin
        ).map(VendorResponse::from)
         .map(ResponseEntity::ok)
         .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete vendor")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal Admin admin) {
        boolean deleted = vendorService.deleteVendor(id, admin);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    // ── Vendor Payments ───────────────────────────────────────────────────────

    @GetMapping("/{vendorId}/payments")
    @Operation(summary = "List payments for a vendor")
    public List<PaymentResponse> getPayments(@PathVariable Long vendorId) {
        return vendorService.getPayments(vendorId)
                .stream().map(PaymentResponse::from).toList();
    }

    @PostMapping("/{vendorId}/payments")
    @Operation(summary = "Record a payment to a vendor")
    public ResponseEntity<PaymentResponse> addPayment(@PathVariable Long vendorId,
                                                      @RequestBody PaymentRequest request,
                                                      @AuthenticationPrincipal Admin admin) {
        VendorPayment saved = vendorService.addPayment(
                vendorId,
                request.amount(),
                request.paymentDate(),
                request.note(),
                admin
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(PaymentResponse.from(saved));
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    record VendorRequest(String vendorName, String vendorType, String customVendorType,
                         String emailId, String purposeUse, List<String> contactNumbers) {}

    record PaymentRequest(BigDecimal amount, LocalDate paymentDate, String note) {}

    record VendorResponse(Long id, String vendorName, String vendorType, String customVendorType,
                          String emailId, String purposeUse, BigDecimal totalAmountPaid,
                          List<String> contactNumbers, Instant createdAt, Instant updatedAt) {
        static VendorResponse from(Vendor v) {
            return new VendorResponse(
                    v.getId(), v.getVendorName(), v.getVendorType(), v.getCustomVendorType(),
                    v.getEmailId(), v.getPurposeUse(), v.getTotalAmountPaid(),
                    v.getContactNumbers().stream().map(VendorContactNumber::getContactNumber).toList(),
                    v.getCreatedAt(), v.getUpdatedAt());
        }
    }

    record PaymentResponse(Long id, Long vendorId, String vendorName,
                           BigDecimal amount, LocalDate paymentDate,
                           String note, Instant createdAt) {
        static PaymentResponse from(VendorPayment p) {
            return new PaymentResponse(
                    p.getId(),
                    p.getVendor() != null ? p.getVendor().getId() : null,
                    p.getVendorName(), p.getAmount(), p.getPaymentDate(),
                    p.getNote(), p.getCreatedAt());
        }
    }
}
