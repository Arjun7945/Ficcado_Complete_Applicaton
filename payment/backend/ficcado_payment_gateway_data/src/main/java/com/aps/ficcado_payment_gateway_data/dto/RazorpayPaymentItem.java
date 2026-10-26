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
public class RazorpayPaymentItem {

    private String id;

    @JsonProperty("order_id")
    private String orderId;

    private String status; // "captured", "failed", "authorized", "refunded"

    private Long amount; // in paise

    private String currency;

    private String method; // "upi", "card", "netbanking"

    private Boolean captured;

    @JsonProperty("error_code")
    private String errorCode;

    @JsonProperty("error_description")
    private String errorDescription;

    public boolean isCaptured() {
        return "captured".equalsIgnoreCase(this.status) || Boolean.TRUE.equals(this.captured);
    }

    public boolean isFailed() {
        return "failed".equalsIgnoreCase(this.status);
    }

    public BigDecimal getAmountInRupees() {
        if (amount == null) return BigDecimal.ZERO;
        return BigDecimal.valueOf(amount).divide(BigDecimal.valueOf(100));
    }
}
