package com.aps.ficcado_crm_backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "item_colors", uniqueConstraints = {
        @UniqueConstraint(name = "uq_item_colors_item_color", columnNames = {"item_id", "color_hex"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemColor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    @JsonIgnore
    private Item item;

    @Column(name = "color_hex", nullable = false, length = 7)
    private String colorHex;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;
}
