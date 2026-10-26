package com.aps.ficcado_crm_backend.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Data Transfer Objects for the Inventory module.
 */
public class InventoryDto {

    public record InventoryRequest(
            Long itemId,
            String itemName,
            String size,
            Integer totalQuantity,
            Integer qty
    ) {}

    public record QuantityAdjustRequest(
            @Min(value = 0, message = "Total quantity must be 0 or greater") int totalQuantity,
            String reason
    ) {}

    public record UnallocatedResponse(Long itemId, String size, int unallocatedQuantity) {}

    public record InventoryResponse(
            Long id,
            Long itemId,
            String itemName,
            String size,
            int totalQuantity,
            String currentStatus
    ) {}
}
