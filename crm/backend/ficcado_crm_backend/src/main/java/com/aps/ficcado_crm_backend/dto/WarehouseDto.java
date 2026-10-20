package com.aps.ficcado_crm_backend.dto;

import jakarta.validation.constraints.*;

/**
 * Data Transfer Objects for the Warehouse module.
 */
public class WarehouseDto {

    public record WarehouseRequest(
            @NotBlank(message = "Warehouse location is required") String warehouseLocation,
            Long handlerAdminId,
            String handlerName,
            Long itemId,
            String itemName,
            @NotBlank(message = "Size is required") String size,
            @Min(value = 0, message = "Quantity must be 0 or greater") int quantity
    ) {}

    public record WarehouseResponse(
            Long id,
            String warehouseLocation,
            Long handlerAdminId,
            String handlerAdminName,
            Long itemId,
            String itemName,
            String size,
            int quantity
    ) {}

    public record AllocationUpdateRequest(
            @NotNull(message = "Quantity is required")
            @Min(value = 0, message = "Quantity must be 0 or greater")
            Integer quantity
    ) {}
}
