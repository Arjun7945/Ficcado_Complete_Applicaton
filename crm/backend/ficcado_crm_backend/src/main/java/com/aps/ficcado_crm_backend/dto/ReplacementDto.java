package com.aps.ficcado_crm_backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Data Transfer Objects for the Replacement module.
 * Extracted from ReplacementController inner records to enable Bean Validation via @Valid.
 */
public class ReplacementDto {

    public record OldItemRequest(
            Long itemId,
            @NotBlank(message = "Item name is required") String itemName,
            @NotBlank(message = "Size is required") String size,
            @Min(value = 1, message = "Quantity must be at least 1") int quantity
    ) {}

    public record NewItemRequest(
            Long itemId,
            @NotBlank(message = "Item name is required") String itemName,
            @NotBlank(message = "Size is required") String size,
            @Min(value = 1, message = "Quantity must be at least 1") int quantity,
            BigDecimal priceEach,
            BigDecimal totalPrice
    ) {}

    public record ReplacementRequest(
            @NotNull(message = "Sale ID is required") Long saleId,
            @NotBlank(message = "Invoice number is required") String invoiceNumber,
            String status,
            String dispositionOfOldItems,
            String restockDestination,
            String newStockSource,
            BigDecimal newDeliveryCharge,
            BigDecimal newDiscount,
            BigDecimal newTotalAmount,
            @NotEmpty(message = "At least one old item is required") List<@Valid OldItemRequest> oldItems,
            @NotEmpty(message = "At least one new item is required") List<@Valid NewItemRequest> newItems
    ) {}

    public record ReplacementUpdateRequest(
            String status,
            String dispositionOfOldItems,
            String restockDestination,
            String newStockSource,
            BigDecimal newDeliveryCharge,
            BigDecimal newDiscount,
            BigDecimal newTotalAmount,
            List<@Valid OldItemRequest> oldItems,
            List<@Valid NewItemRequest> newItems
    ) {}

    public record StatusRequest(
            @NotBlank(message = "Status is required") String status
    ) {}

    public record OldItemResponse(
            Long id,
            Long itemId,
            String itemName,
            String size,
            int quantity
    ) {}

    public record NewItemResponse(
            Long id,
            Long itemId,
            String itemName,
            String size,
            int quantity,
            BigDecimal priceEach,
            BigDecimal totalPrice
    ) {}

    public record ReplacementResponse(
            Long id,
            Long saleId,
            String invoiceNumber,
            String invoiceStatus,
            String dispositionOfOldItems,
            String restockDestination,
            String newStockSource,
            BigDecimal newDeliveryCharge,
            BigDecimal newDiscount,
            BigDecimal newTotalAmount,
            int version,
            Instant createdAt,
            Instant updatedAt,
            List<OldItemResponse> oldItems,
            List<NewItemResponse> newItems
    ) {}
}
