package com.aps.ficcado_crm_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "sales_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "module", nullable = false, length = 100)
    private String module;

    @Column(name = "operation", nullable = false, length = 100)
    private String operation;

    @Column(name = "related_invoice_number", length = 100)
    private String relatedInvoiceNumber;

    @Column(name = "log_message", columnDefinition = "TEXT")
    private String logMessage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id")
    private Admin admin;

    // Snapshot for display
    @Column(name = "admin_name", length = 255)
    private String adminName;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
