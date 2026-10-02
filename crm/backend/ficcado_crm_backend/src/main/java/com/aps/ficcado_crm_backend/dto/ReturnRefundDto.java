package com.aps.ficcado_crm_backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Data Transfer Objects for the ReturnRefund module.
 * Extracted from ReturnRefundController inner records to enable Bean Validation via @Valid.
 */
public class ReturnRefundDto {

    public record ReturnedItemRequest(
            Long itemId,
            String itemName,
            @NotBlank(message = "Size is required for returned item") String size,
            @Min(value = 1, message = "Quantity must be at least 1") int quantity,
            BigDecimal priceEach,
            BigDecimal totalPrice
    ) {}

    public record ReturnRefundRequest(
            @NotNull(message = "Sale ID is required") Long saleId,
            @NotBlank(message = "Invoice number is required") String invoiceNumber,
            String reasonForReturn,
            @NotEmpty(message = "At least one returned item is required") List<@Valid ReturnedItemRequest> returnedItems
    ) {}

    public record ReturnRefundUpdateRequest(
            @Size(max = 50, message = "Item verification status must not exceed 50 characters") String itemVerificationStatus,
            @Size(max = 50, message = "Refund status must not exceed 50 characters") String refundStatus,
            @PositiveOrZero(message = "Refund amount must be 0 or greater") BigDecimal refundAmount,
            Instant refundCompletedDateTime,
            @Size(max = 100, message = "Transaction ID must not exceed 100 characters") String transactionId,
            @Size(max = 50, message = "Mode of refund must not exceed 50 characters") String modeOfRefund,
            @Size(max = 50, message = "Disposition must not exceed 50 characters") String dispositionOfReturnedItems,
            @Size(max = 100, message = "Restock destination must not exceed 100 characters") String restockDestination,
            @PositiveOrZero(message = "Price charged returned items must be 0 or greater") BigDecimal priceChargedReturnedItems,
            @PositiveOrZero(message = "New discount applied must be 0 or greater") BigDecimal newDiscountApplied,
            @Size(max = 500, message = "Reason for return must not exceed 500 characters") String reasonForReturn,
            Boolean markRefundCompleted
    ) {}

    public record ReturnedItemResponse(
            Long id,
            Long itemId,
            String itemName,
            String size,
            int quantity,
            BigDecimal priceEach,
            BigDecimal totalPrice
    ) {}

    public record ReturnRefundResponse(
            Long id,
            Long saleId,
            String invoiceNumber,
            String itemVerificationStatus,
            String refundStatus,
            BigDecimal refundAmount,
            Instant refundCompletedDateTime,
            String transactionId,
            String modeOfRefund,
            String dispositionOfReturnedItems,
            String restockDestination,
            BigDecimal priceChargedReturnedItems,
            BigDecimal newDiscountApplied,
            String reasonForReturn,
            Long closedByAdminId,
            String closedByAdminName,
            int version,
            Instant createdAt,
            Instant updatedAt,
            List<ReturnedItemResponse> returnedItems
    ) {}
}
