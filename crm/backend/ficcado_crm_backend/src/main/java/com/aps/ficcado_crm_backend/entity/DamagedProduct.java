package com.aps.ficcado_crm_backend.entity;

import com.aps.ficcado_crm_backend.entity.enums.DamagedProductSource;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "damaged_products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DamagedProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_number", length = 100)
    @Builder.Default
    private String invoiceNumber = "Non_Sale_Damaged_Item";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id")
    private Sale sale;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id")
    private Item item;

    @Column(name = "item_name", nullable = false, length = 255)
    private String itemName;

    @Column(name = "size", length = 50)
    private String size;

    @Column(name = "quantity", nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    @Column(name = "customer_name", length = 255)
    @Builder.Default
    private String customerName = "Internal_Stock";

    @Column(name = "reason_notes", columnDefinition = "TEXT")
    @Builder.Default
    private String reasonNotes = "Damaged_In_Handling";

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 100)
    private DamagedProductSource source;

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
