package com.aps.ficcado_payment_gateway_data.client;

import com.aps.ficcado_payment_gateway_data.dto.RazorpayPaymentItem;
import com.aps.ficcado_payment_gateway_data.dto.RazorpayRefundResult;

import java.math.BigDecimal;
import java.util.List;

/**
 * Razorpay API Client Interface (Part 2 Phase P2-8).
 * Provides HTTP operations for payment status inspection, refund initiation, and refund inquiry.
 */
public interface RazorpayApiClient {

    List<RazorpayPaymentItem> fetchPaymentsForOrder(String razorpayOrderId);

    RazorpayRefundResult initiateRefund(String paymentId, BigDecimal amount, String note);

    String fetchRefundStatus(String refundId);

    CircuitBreaker getCircuitBreaker();

    void resetCircuitBreaker();
}
