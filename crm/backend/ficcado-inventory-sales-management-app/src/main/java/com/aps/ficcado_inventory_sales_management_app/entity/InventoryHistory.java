package com.aps.ficcado_inventory_sales_management_app.entity;

import com.aps.ficcado_inventory_sales_management_app.entity.enums.InventoryTransactionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "inventory_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id")
    private Item item;

    // Snapshot for display
    @Column(name = "item_name", nullable = false, length = 255)
    private String itemName;

    @Column(name = "size", length = 50)
    private String size;

    @Column(name = "quantity_change", nullable = false)
    private Integer quantityChange;

    @Column(name = "affected_location", length = 100)
    private String affectedLocation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handler_admin_id")
    private Admin handlerAdmin;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", length = 100)
    private InventoryTransactionType transactionType;

    @Column(name = "related_invoice_number", length = 100)
    private String relatedInvoiceNumber;

    /**
     * Null for DAMAGED_DISPOSAL (no inventory/warehouse change).
     * Use resultingBalanceNote in that case.
     */
    @Column(name = "resulting_balance")
    private Integer resultingBalance;

    /**
     * For DAMAGED_DISPOSAL: "N/A — sent to Damaged Products, no Inventory/Warehouse change"
     * Otherwise null.
     */
    @Column(name = "resulting_balance_note", length = 255)
    private String resultingBalanceNote;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id")
    private Admin admin;

    // Snapshot for display
    @Column(name = "admin_name", length = 255)
    private String adminName;

    @CreationTimestamp
    @Column(name = "logged_at", nullable = false, updatable = false)
    private Instant loggedAt;
}
