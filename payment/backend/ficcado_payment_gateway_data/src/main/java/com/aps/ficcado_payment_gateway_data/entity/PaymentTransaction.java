package com.aps.ficcado_payment_gateway_data.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_id", nullable = false, unique = true, length = 100)
    private String transactionId;

    @Column(name = "razorpay_order_id", nullable = false, length = 100)
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id", unique = true, length = 100)
    private String razorpayPaymentId;

    @Column(name = "razorpay_signature", length = 255)
    private String razorpaySignature;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "customer_name", nullable = false, length = 255)
    private String customerName;

    @Column(name = "customer_email", nullable = false, length = 255)
    private String customerEmail;

    @Column(name = "customer_phone", nullable = false, length = 50)
    private String customerPhone;

    @Column(name = "shipping_address", nullable = false, columnDefinition = "TEXT")
    private String shippingAddress;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    @Column(name = "payment_status", nullable = false, length = 50)
    @Builder.Default
    private String paymentStatus = "CREATED";

    @Column(name = "sync_status", nullable = false, length = 50)
    @Builder.Default
    private String syncStatus = "PENDING";

    @Column(name = "ficcado_invoice_number", length = 100)
    private String ficcadoInvoiceNumber;

    @Column(name = "ficcado_sale_id")
    private Long ficcadoSaleId;

    @Column(name = "order_items_json", nullable = false, columnDefinition = "TEXT")
    private String orderItemsJson;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "webhook_events_count", nullable = false)
    @Builder.Default
    private Integer webhookEventsCount = 0;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(name = "address_id")
    private Long addressId;

    @Column(name = "courier_partner", length = 100)
    private String courierPartner;

    @Column(name = "delivery_charge", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal deliveryCharge = BigDecimal.ZERO;

    @Column(name = "refund_id", length = 100)
    private String refundId;

    @Column(name = "reconciliation_run_count", nullable = false)
    @Builder.Default
    private Integer reconciliationRunCount = 0;

    @Column(name = "last_reconciled_at")
    private Instant lastReconciledAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Transition the payment transaction state using strict state machine rules.
     * Throws IllegalStateException if transition is not permitted.
     */
    public synchronized void transitionTo(PaymentStatus targetStatus, String reason) {
        PaymentStatus current;
        try {
            current = PaymentStatus.valueOf(this.paymentStatus);
        } catch (Exception e) {
            current = PaymentStatus.CREATED;
        }

        if (current == targetStatus) {
            return; // Idempotent
        }

        if (!current.canTransitionTo(targetStatus)) {
            throw new IllegalStateException("Illegal payment status transition: cannot transition from "
                    + current + " to " + targetStatus + " for transaction " + this.transactionId);
        }

        this.paymentStatus = targetStatus.name();
        if (reason != null && !reason.isBlank()) {
            this.failureReason = reason;
        }
    }
}
