package com.aps.ficcado_crm_backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Data Transfer Objects for the Sale module.
 * Extracted from SaleController inner records to enable Bean Validation via @Valid.
 */
public class SaleDto {

    public record LineItemRequest(
            Long itemId,
            String itemName,
            @NotBlank(message = "Size is required for each line item") String size,
            @Min(value = 1, message = "Quantity must be at least 1") int quantity,
            BigDecimal priceEach,
            BigDecimal totalPrice
    ) {}

    public record AddItemsRequest(
            List<@Valid LineItemRequest> items,
            List<@Valid LineItemRequest> lineItems
    ) {}

    public record CompleteSaleRequest(
            @Size(max = 50, message = "Payment status must not exceed 50 characters") String paymentStatus,
            @Size(max = 50, message = "Mode of payment must not exceed 50 characters") String modeOfPayment,
            @Size(max = 100, message = "Transaction ID must not exceed 100 characters") String transactionId,
            @Size(max = 50, message = "Delivery status must not exceed 50 characters") String deliveryStatus,
            @Size(max = 100, message = "Received by must not exceed 100 characters") String receivedBy,
            @Size(max = 500, message = "Remarks must not exceed 500 characters") String remarks
    ) {}

    public record SaleRequest(
            @NotBlank(message = "Invoice number is required") String invoiceNumber,
            @NotBlank(message = "Customer name is required") String customerName,
            @NotBlank(message = "Customer phone number is required") String customerPhoneNumber,
            String customerAddress,
            String customerEmail,
            String saleStatus,
            String paymentStatus,
            String modeOfPayment,
            String transactionId,
            String deliveryStatus,
            Boolean deliveryChargeEnabled,
            BigDecimal deliveryChargeAmount,
            @NotBlank(message = "Fulfilment source is required") String fulfilmentSource,
            String fulfilmentRequestStatus,
            String fulfilmentStatus,
            Long saleClosedByAdminId,
            BigDecimal discount,
            @NotNull(message = "Total amount is required")
            @DecimalMin(value = "0.0", message = "Total amount must be 0 or greater") BigDecimal totalAmount,
            String receivedBy,
            String remarks,
            @NotEmpty(message = "At least one line item is required") List<@Valid LineItemRequest> lineItems
    ) {}

    public record LineItemResponse(
            Long id,
            Long itemId,
            String itemName,
            String size,
            int quantity,
            BigDecimal priceEach,
            BigDecimal totalPrice
    ) {}

    public record SaleResponse(
            Long id,
            String invoiceNumber,
            Long customerId,
            String customerName,
            String customerPhoneNumber,
            String customerAddress,
            String customerEmail,
            String saleStatus,
            String paymentStatus,
            String modeOfPayment,
            String transactionId,
            String deliveryStatus,
            boolean deliveryChargeEnabled,
            BigDecimal deliveryChargeAmount,
            String fulfilmentSource,
            String fulfilmentRequestStatus,
            String fulfilmentStatus,
            boolean isLocked,
            BigDecimal discount,
            BigDecimal totalAmount,
            Long saleClosedByAdminId,
            String saleClosedByAdminName,
            String receivedBy,
            String remarks,
            int version,
            Instant createdAt,
            Instant updatedAt,
            List<LineItemResponse> lineItems
    ) {}
}
