package com.aps.ficcado_crm_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.time.Instant;

/**
 * Data Transfer Objects for the DamagedProduct module.
 */
public class DamagedProductDto {

    public record ManualDamagedRequest(
            Long itemId,
            @NotBlank(message = "Item name is required") String itemName,
            @NotBlank(message = "Size is required") String size,
            @Positive(message = "Quantity must be greater than 0") int quantity,
            String reasonNotes,
            String invoiceNumber
    ) {}

    public record DamagedResponse(
            Long id,
            String invoiceNumber,
            Long saleId,
            Long itemId,
            String itemName,
            String size,
            int quantity,
            String customerName,
            String reasonNotes,
            String source,
            Instant createdAt
    ) {}
}
