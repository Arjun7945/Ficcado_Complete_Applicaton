package com.aps.ficcado_inventory_sales_management_app.entity;

import com.aps.ficcado_inventory_sales_management_app.entity.enums.DispositionOfItems;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.FulfilmentSource;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.ReplacementStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "replacements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Replacement {

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
    @Column(name = "invoice_status", nullable = false, length = 100)
    @Builder.Default
    private ReplacementStatus invoiceStatus = ReplacementStatus.APPROVED;

    @Enumerated(EnumType.STRING)
    @Column(name = "disposition_of_old_items", length = 100)
    private DispositionOfItems dispositionOfOldItems;

    @Column(name = "restock_destination", length = 100)
    private String restockDestination;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_stock_source", length = 100)
    private FulfilmentSource newStockSource;

    @Column(name = "new_delivery_charge", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal newDeliveryCharge = BigDecimal.ZERO;

    @Column(name = "new_discount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal newDiscount = BigDecimal.ZERO;

    @Column(name = "new_total_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal newTotalAmount = BigDecimal.ZERO;

    // Old items returned by customer
    @OneToMany(mappedBy = "replacement", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private java.util.Set<ReplacementOldItem> oldItems = new java.util.HashSet<>();

    // New items dispatched to customer
    @OneToMany(mappedBy = "replacement", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private java.util.Set<ReplacementNewItem> newItems = new java.util.HashSet<>();

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
