package com.aps.ficcado_crm_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * Data Transfer Objects for the Admin module.
 */
public class AdminDto {

    public record AdminCreateRequest(
            @NotBlank(message = "Admin name is required") String adminName,
            @NotBlank(message = "Email is required") @Email(message = "Invalid email format") String emailId,
            @NotBlank(message = "Phone number is required") String phoneNumber,
            @NotBlank(message = "Password is required") @Size(min = 6, message = "Password must be at least 6 characters") String password,
            @NotBlank(message = "Role is required") String role
    ) {}

    public record AdminUpdateRequest(
            String adminName,
            String phoneNumber,
            String notifications,
            String password,
            Boolean isActive
    ) {}

    public record AdminResponse(
            Long id,
            String adminName,
            String emailId,
            String phoneNumber,
            String role,
            String notifications,
            boolean isActive,
            Instant createdAt,
            Instant updatedAt
    ) {}
}
