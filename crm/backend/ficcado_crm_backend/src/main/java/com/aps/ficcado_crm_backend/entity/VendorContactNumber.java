package com.aps.ficcado_crm_backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "vendor_contact_numbers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorContactNumber {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id", nullable = false)
    private Vendor vendor;

    @Column(name = "contact_number", nullable = false, length = 50)
    private String contactNumber;
}
