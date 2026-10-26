package com.aps.ficcado_payment_gateway_data.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class RazorpayRefundResult {

    private String id; // e.g. "rfnd_xxx"

    @JsonProperty("payment_id")
    private String paymentId;

    private Long amount; // in paise

    private String currency;

    private String status; // "processed", "pending", "failed"

    public boolean isProcessed() {
        return "processed".equalsIgnoreCase(this.status);
    }

    public BigDecimal getAmountInRupees() {
        if (amount == null) return BigDecimal.ZERO;
        return BigDecimal.valueOf(amount).divide(BigDecimal.valueOf(100));
    }
}
