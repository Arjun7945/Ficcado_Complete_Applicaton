package com.aps.ficcado_crm_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Data Transfer Objects for the Authentication module.
 */
public class AuthDto {

    /**
     * Login request body.
     * CRM accepts email ONLY — no username field is exposed here.
     */
    public record LoginRequest(
            @NotBlank(message = "Email is required")
            @Email(message = "Invalid email format")
            String email,

            @NotBlank(message = "Password is required")
            String password
    ) {}

    public record AdminSummary(
            Long id,
            String adminName,
            String emailId,
            String role,
            String notifications
    ) {}
}
