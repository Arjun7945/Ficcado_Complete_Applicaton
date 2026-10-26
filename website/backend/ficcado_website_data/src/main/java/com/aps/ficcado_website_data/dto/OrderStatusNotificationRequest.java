package com.aps.ficcado_website_data.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record OrderStatusNotificationRequest(
        String eventType,
        @NotBlank String transactionId,
        String razorpayOrderId,
        @NotBlank String status,
        String invoiceNumber,
        Long saleId,
        @NotBlank String customerEmail,
        String customerName,
        BigDecimal amount,
        String failureReason
) {}
