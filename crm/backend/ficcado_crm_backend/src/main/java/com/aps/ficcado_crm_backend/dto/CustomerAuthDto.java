package com.aps.ficcado_crm_backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Data Transfer Objects for Customer Storefront Authentication & Profile.
 */
public class CustomerAuthDto {

    public record CustomerRegistrationRequest(
            @NotBlank(message = "Customer name is required")
            String name,

            @NotBlank(message = "Email address is required")
            @Email(message = "Valid email is required")
            String email,

            @NotBlank(message = "Phone number is required")
            @Pattern(regexp = "^(\\+91)?[6-9]\\d{9}$", message = "Valid 10-digit Indian mobile number is required")
            String phone,

            @NotBlank(message = "Password is required")
            @Size(min = 6, message = "Password must be at least 6 characters")
            String password,

            String address
    ) {}

    public record CustomerLoginRequest(
            @NotBlank(message = "Email address is required")
            @Email(message = "Valid email is required")
            String email,

            @NotBlank(message = "Password is required")
            String password
    ) {}

    public record CustomerOtpLoginRequest(
            @NotBlank(message = "Email address is required")
            @Email(message = "Valid email is required")
            String email,

            @NotBlank(message = "Verification token is required")
            String verificationToken
    ) {}

    public record CustomerAuthResponse(
            boolean success,
            String message,
            String token,
            CustomerProfileResponse customer
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CustomerProfileResponse(
            Long id,
            String name,
            String email,
            String phone,
            boolean emailVerified,
            boolean phoneVerified,
            Integer totalOrders,
            List<CustomerAddressDto> addresses
    ) {}

    public record CustomerAddressDto(
            Long id,
            String address,
            boolean isDefault
    ) {}

    public record UpdateProfileRequest(
            String name,
            String phone,
            String address
    ) {}

    public record CustomerOrderSummaryResponse(
            Long id,
            String invoiceNumber,
            String saleStatus,
            String paymentStatus,
            String deliveryStatus,
            String courierPartner,
            String trackingNumber,
            BigDecimal subtotal,
            BigDecimal deliveryCharge,
            BigDecimal grandTotal,
            Instant createdAt,
            List<CustomerOrderLineItemDto> lineItems
    ) {}

    public record CustomerOrderLineItemDto(
            Long id,
            Long itemId,
            String itemName,
            String size,
            Integer quantity,
            BigDecimal priceEach,
            String itemImage
    ) {}
}
