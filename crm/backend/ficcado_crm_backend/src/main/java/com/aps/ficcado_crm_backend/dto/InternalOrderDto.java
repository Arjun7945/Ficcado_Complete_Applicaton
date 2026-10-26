package com.aps.ficcado_crm_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.List;

public class InternalOrderDto {

    public record InternalOrderLineItem(
            Long itemId,
            @NotBlank String itemName,
            @NotBlank String size,
            @NotNull @Positive Integer quantity,
            @NotNull BigDecimal priceEach
    ) {}

    public record CreatePaidSaleRequest(
            @NotBlank String transactionId,
            String razorpayOrderId,
            @NotNull BigDecimal amount,
            @NotBlank String customerName,
            @NotBlank String customerEmail,
            @NotBlank String customerPhone,
            @NotBlank String customerAddress,
            BigDecimal deliveryChargeAmount,
            String courierPartner,
            @NotEmpty List<InternalOrderLineItem> lineItems
    ) {}

    public record InternalSaleResponse(
            boolean success,
            String message,
            Long saleId,
            String invoiceNumber,
            BigDecimal totalAmount,
            String status,
            boolean isDuplicate
    ) {}

    public record QuoteRequestItem(
            @NotNull Long itemId,
            @NotBlank String size,
            @NotNull @Positive Integer quantity
    ) {}

    public record QuoteRequest(
            @NotEmpty List<QuoteRequestItem> items,
            String courierId
    ) {}

    public record QuoteLineItem(
            Long itemId,
            String itemName,
            String size,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            boolean available,
            String error
    ) {}

    public record OrderQuoteResponse(
            boolean valid,
            String message,
            List<QuoteLineItem> lineItems,
            BigDecimal subtotal,
            BigDecimal deliveryCharge,
            String courierId,
            String courierName,
            BigDecimal totalAmount
    ) {}
}
