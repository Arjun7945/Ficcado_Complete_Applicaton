package com.aps.ficcado_inventory_sales_management_app.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "item_sizes", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"item_id", "size"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemSize {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(name = "size", nullable = false, length = 50)
    private String size;
}
