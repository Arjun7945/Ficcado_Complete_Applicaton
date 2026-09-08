package com.aps.ficcado_inventory_sales_management_app.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Represents a single image associated with a CRM item.
 *
 * Images are stored in Cloudflare R2 (S3-compatible); this entity stores only the URLs.
 * The MediaStorageService handles actual upload/delete operations against R2.
 *
 * display_order == 1 is the item's "cover image" — shown as the thumbnail
 * everywhere the item is referenced across the CRM (Sales, Replacement,
 * Return/Refund, Inventory, Warehouse, Damaged Products lists).
 */
@Entity
@Table(
    name = "item_images",
    indexes = {
        @Index(name = "idx_item_images_item_order", columnList = "item_id, display_order"),
        @Index(name = "idx_item_images_item",       columnList = "item_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Item item;


    /**
     * Full-resolution (capped) image URL on Cloudflare R2.
     * Format: https://<R2_PUBLIC_DOMAIN>/items/{itemId}/full/{uuid}.webp
     */
    @Column(name = "image_url", nullable = false, columnDefinition = "TEXT")
    private String imageUrl;

    /**
     * Thumbnail image URL on Cloudflare R2.
     * Format: https://<R2_PUBLIC_DOMAIN>/items/{itemId}/thumb/{uuid}.webp
     * Generated server-side during upload (R2 does not auto-thumbnail).
     */
    @Column(name = "thumbnail_url", nullable = false, columnDefinition = "TEXT")
    private String thumbnailUrl;

    /** Optional admin-entered caption for the image. */
    @Column(name = "caption", length = 500)
    private String caption;

    /**
     * Sort order for this item's image strip.
     * display_order == 1 is the item's cover image shown as thumbnail across the CRM.
     * Admin can reorder; first upload defaults to 1.
     */
    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 1;

    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private Instant uploadedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Admin uploadedBy;

}
