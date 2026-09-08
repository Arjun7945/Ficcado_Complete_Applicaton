package com.aps.ficcado_inventory_sales_management_app.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "vendors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vendor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vendor_name", nullable = false, length = 255)
    private String vendorName;

    @Column(name = "vendor_type", length = 100)
    private String vendorType;

    @Column(name = "custom_vendor_type", length = 100)
    private String customVendorType;

    @Column(name = "email_id", length = 255)
    private String emailId;

    @Column(name = "purpose_use", columnDefinition = "TEXT")
    private String purposeUse;

    @Column(name = "total_amount_paid", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalAmountPaid = BigDecimal.ZERO;

    // Contact numbers — child table (replaces comma-separated contact_numbers column)
    @OneToMany(mappedBy = "vendor", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<VendorContactNumber> contactNumbers = new ArrayList<>();

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
