package com.aps.ficcado_inventory_sales_management_app.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "activity_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id")
    private Admin admin;

    // Snapshot — preserved even if admin is later deleted
    @Column(name = "admin_name", length = 255)
    private String adminName;

    @Column(name = "action", nullable = false, length = 100)
    private String action;

    @Column(name = "module", length = 100)
    private String module;

    @Column(name = "module_key", length = 100)
    private String moduleKey;

    @Column(name = "record_id", length = 100)
    private String recordId;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @CreationTimestamp
    @Column(name = "logged_at", nullable = false, updatable = false)
    private Instant loggedAt;
}
