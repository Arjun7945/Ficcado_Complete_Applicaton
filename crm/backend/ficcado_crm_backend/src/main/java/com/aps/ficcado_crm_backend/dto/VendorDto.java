package com.aps.ficcado_crm_backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Data Transfer Objects for the Vendor module.
 */
public class VendorDto {

    public record VendorRequest(
            @NotBlank(message = "Vendor name is required") String vendorName,
            @NotBlank(message = "Vendor type is required") String vendorType,
            String customVendorType,
            @Email(message = "Invalid email format") String emailId,
            String purposeUse,
            List<String> contactNumbers
    ) {}

    public record PaymentRequest(
            @NotNull(message = "Payment amount is required")
            @DecimalMin(value = "0.01", message = "Amount must be greater than 0") BigDecimal amount,
            @NotNull(message = "Payment date is required") LocalDate paymentDate,
            String note
    ) {}

    public record VendorResponse(
            Long id,
            String vendorName,
            String vendorType,
            String customVendorType,
            String emailId,
            String purposeUse,
            BigDecimal totalAmountPaid,
            List<String> contactNumbers,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record PaymentResponse(
            Long id,
            Long vendorId,
            String vendorName,
            BigDecimal amount,
            LocalDate paymentDate,
            String note,
            Instant createdAt
    ) {}
}
