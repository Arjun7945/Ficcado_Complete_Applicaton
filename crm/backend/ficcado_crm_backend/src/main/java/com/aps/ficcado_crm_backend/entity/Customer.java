package com.aps.ficcado_crm_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_name", nullable = false, length = 255)
    private String customerName;

    @Column(name = "phone_number", nullable = false, unique = true, length = 50)
    private String phoneNumber;

    @Column(name = "email_id", length = 255)
    private String emailId;

    @Column(name = "total_orders_placed", nullable = false)
    @Builder.Default
    private Integer totalOrdersPlaced = 0;

    // ── E-commerce preparation columns (all nullable — schema prep only) ───────
    // These columns are populated when a customer registers on the future website.
    // They have NO effect on current CRM functionality.

    /** bcrypt password hash — null until the customer registers on the public website. */
    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    /** Timestamp when the customer verified their email — null until verified. */
    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    /** Timestamp when the customer verified their phone number — null until verified. */
    @Column(name = "phone_verified_at")
    private Instant phoneVerifiedAt;

    // invoice_numbers intentionally NOT stored — derived by querying sales.customer_id

    // Child table: multiple saved addresses (replaces flat TEXT address column)
    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<CustomerAddress> addresses = new ArrayList<>();

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

