package com.aps.ficcado_crm_backend.entity;

import com.aps.ficcado_crm_backend.entity.enums.ItemStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_name", nullable = false, length = 255)
    private String itemName;

    @Column(name = "item_type", length = 100)
    private String itemType;

    @Column(name = "price_of_item", precision = 12, scale = 2)
    private BigDecimal priceOfItem;

    @Column(name = "cost_price", precision = 12, scale = 2)
    private BigDecimal costPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_status", nullable = false, length = 50)
    @Builder.Default
    private ItemStatus currentStatus = ItemStatus.ACTIVE;

    // Child table: available sizes (replaces comma-separated available_sizes column)
    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<ItemSize> sizes = new ArrayList<>();

    // ── Item Images (Phase 129) ───────────────────────────────────────────────
    // Ordered by display_order; position-1 is the cover image shown as thumbnail
    // everywhere this item is referenced across the CRM.
    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true,
               fetch = FetchType.EAGER)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    private List<ItemImage> images = new ArrayList<>();


    // ── Review Aggregate (Phase 131) ──────────────────────────────────────────
    // Denormalized for fast display on the Items list — updated within the same
    // @Transactional block as each review insert/delete in ReviewService.

    /** Computed average star rating (0.00 = no reviews yet; range: 0.00–5.00). */
    @Column(name = "average_rating", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal averageRating = BigDecimal.ZERO;

    /** Total number of approved reviews submitted for this item. */
    @Column(name = "review_count", nullable = false)
    @Builder.Default
    private Integer reviewCount = 0;

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

