package com.aps.ficcado_inventory_sales_management_app.entity;

import com.aps.ficcado_inventory_sales_management_app.entity.enums.DispositionOfItems;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.ItemVerificationStatus;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.RefundStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "return_refunds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnRefund {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sale_id", nullable = false)
    private Sale sale;

    // Snapshot for display
    @Column(name = "invoice_number", nullable = false, length = 100)
    private String invoiceNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_verification_status", length = 100)
    private ItemVerificationStatus itemVerificationStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_status", nullable = false, length = 100)
    @Builder.Default
    private RefundStatus refundStatus = RefundStatus.PENDING;

    @Column(name = "refund_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal refundAmount = BigDecimal.ZERO;

    @Column(name = "refund_completed_date_time")
    private Instant refundCompletedDateTime;

    @Column(name = "transaction_id", length = 100)
    private String transactionId;

    @Column(name = "mode_of_refund", length = 50)
    private String modeOfRefund;

    @Enumerated(EnumType.STRING)
    @Column(name = "disposition_of_returned_items", length = 100)
    private DispositionOfItems dispositionOfReturnedItems;

    @Column(name = "restock_destination", length = 100)
    private String restockDestination;

    // "New Final Items" fields intentionally NOT stored — derived as:
    // original sale_line_items MINUS return_refund_items (avoids drift and duplication)

    @Column(name = "price_charged_returned_items", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal priceChargedReturnedItems = BigDecimal.ZERO;

    @Column(name = "new_discount_applied", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal newDiscountApplied = BigDecimal.ZERO;

    @Column(name = "reason_for_return", columnDefinition = "TEXT")
    private String reasonForReturn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by_admin_id")
    private Admin closedByAdmin;

    // Items actually being returned by the customer
    @OneToMany(mappedBy = "returnRefund", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<ReturnRefundItem> returnedItems = new ArrayList<>();

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Integer version = 1;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_admin_id")
    private Admin createdByAdmin;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_admin_id")
    private Admin updatedByAdmin;
}
