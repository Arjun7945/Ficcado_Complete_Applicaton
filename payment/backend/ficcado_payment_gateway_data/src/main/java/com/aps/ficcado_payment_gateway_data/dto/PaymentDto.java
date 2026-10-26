package com.aps.ficcado_payment_gateway_data.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.List;

public class PaymentDto {

    public record OrderItemDto(
            Long itemId,
            String itemName,
            @NotBlank String size,
            @NotNull @Positive Integer quantity,
            BigDecimal priceEach
    ) {}

    public record CreateOrderRequest(
            BigDecimal amount,
            String currency,
            Long customerId,
            String customerName,
            String customerEmail,
            String customerPhone,
            String shippingAddress,
            Long addressId,
            BigDecimal deliveryCharge,
            String courierPartner,
            @NotEmpty List<OrderItemDto> items
    ) {}

    public record CreateOrderResponse(
            boolean success,
            String orderId,
            String transactionId,
            BigDecimal amount,
            Long amountInPaise,
            String currency,
            String keyId,
            String customerName,
            String customerEmail,
            String customerPhone
    ) {}

    public record VerifyPaymentRequest(
            @NotBlank String razorpayOrderId,
            @NotBlank String razorpayPaymentId,
            @NotBlank String razorpaySignature
    ) {}

    public record VerifyPaymentResponse(
            boolean success,
            boolean verified,
            String message,
            String invoiceNumber,
            Long saleId,
            String transactionId,
            String status
    ) {}

    public record PaymentStatusResponse(
            String transactionId,
            String razorpayOrderId,
            String razorpayPaymentId,
            BigDecimal amount,
            String currency,
            String paymentStatus,
            String syncStatus,
            String invoiceNumber,
            Long saleId,
            String customerName,
            String customerEmail,
            String failureReason,
            String createdAt
    ) {}

    public record OrderStatusEvent(
            String eventType,
            String transactionId,
            String razorpayOrderId,
            String status,
            String invoiceNumber,
            Long saleId,
            String customerEmail,
            String customerName,
            BigDecimal amount,
            String failureReason
    ) {}
}

