package com.aps.ficcado_crm_backend.dto;

import java.math.BigDecimal;

public class DeliveryOptionDto {

    public record DeliveryOptionResponse(
            String id,
            String name,
            BigDecimal rate,
            String deliveryTime,
            String status
    ) {}
}
