package com.aps.ficcado_crm_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

/**
 * Data Transfer Objects for the Customer module.
 */
public class CustomerDto {

    public record CustomerUpdateRequest(
            @NotBlank(message = "Phone number is required") String phone,
            String name,
            @Email(message = "Invalid email format") String email,
            List<String> addresses
    ) {}

    public record AddressDto(
            Long id,
            String address,
            boolean isDefault
    ) {}

    public record CustomerResponse(
            Long id,
            String customerName,
            String phoneNumber,
            String emailId,
            int totalOrdersPlaced,
            List<AddressDto> addresses
    ) {}
}
