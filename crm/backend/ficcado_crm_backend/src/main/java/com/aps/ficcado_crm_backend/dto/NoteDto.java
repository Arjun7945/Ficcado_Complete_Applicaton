package com.aps.ficcado_crm_backend.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

/**
 * Data Transfer Objects for the KeepNote module.
 */
public class NoteDto {

    public record NoteRequest(
            @NotBlank(message = "Note content cannot be empty")
            String noteContent
    ) {}

    public record NoteResponse(
            Long id,
            String noteContent,
            Long createdByAdminId,
            String createdByAdminName,
            Instant createdAt,
            Instant updatedAt
    ) {}
}
