package com.aps.ficcado_crm_backend.entity;

import com.aps.ficcado_crm_backend.entity.enums.DeliveryStatus;
import com.aps.ficcado_crm_backend.entity.enums.FulfilmentSource;
import com.aps.ficcado_crm_backend.entity.enums.PaymentStatus;
import com.aps.ficcado_crm_backend.entity.enums.SaleStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sales")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_number", nullable = false, unique = true, length = 100)
    private String invoiceNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    // Denormalized customer snapshot at time of sale
    @Column(name = "customer_name", nullable = false, length = 255)
    private String customerName;

    @Column(name = "customer_phone_number", length = 50)
    private String customerPhoneNumber;

    @Column(name = "customer_address", columnDefinition = "TEXT")
    @Builder.Default
    private String customerAddress = "Address_Not_Provided_Yet";

    @Column(name = "customer_email", length = 255)
    @Builder.Default
    private String customerEmail = "No_Email_Provided";

    @Enumerated(EnumType.STRING)
    @Column(name = "sale_status", nullable = false, length = 100)
    @Builder.Default
    private SaleStatus saleStatus = SaleStatus.COMPLETED;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 50)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PAID;

    @Column(name = "mode_of_payment", length = 50)
    @Builder.Default
    private String modeOfPayment = "Not_Selected_Yet";

    @Column(name = "transaction_id", length = 100)
    @Builder.Default
    private String transactionId = "No_transaction_id_Collected_Yet";

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_status", nullable = false, length = 100)
    @Builder.Default
    private DeliveryStatus deliveryStatus = DeliveryStatus.DELIVERED;

    @Column(name = "delivery_charge_enabled", nullable = false)
    @Builder.Default
    private Boolean deliveryChargeEnabled = false;

    @Column(name = "delivery_charge_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal deliveryChargeAmount = BigDecimal.ZERO;

    @Column(name = "fulfilment_request_status", length = 100)
    @Builder.Default
    private String fulfilmentRequestStatus = "Normal";

    @Enumerated(EnumType.STRING)
    @Column(name = "fulfilment_source", length = 100)
    @Builder.Default
    private FulfilmentSource fulfilmentSource = FulfilmentSource.TAKE_FROM_INVENTORY;

    @Column(name = "discount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_closed_by_admin_id")
    private Admin saleClosedByAdmin;

    @Column(name = "received_by", length = 255)
    @Builder.Default
    private String receivedBy = "Not_Received_Yet";

    @Column(name = "remarks", columnDefinition = "TEXT")
    @Builder.Default
    private String remarks = "No_Remarks";

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Integer version = 1;

    // Sale line items — replaces comma-separated items/sizes/prices columns
    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<SaleLineItem> lineItems = new ArrayList<>();

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
