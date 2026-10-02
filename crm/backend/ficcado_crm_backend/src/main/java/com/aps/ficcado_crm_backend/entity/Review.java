package com.aps.ficcado_crm_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * A customer star rating submitted via a tokenized, expiring public link.
 *
 * One review per sale_line_item_id — a customer can review the same item again
 * if they purchase it in a separate order (different sale_line_item_id), but
 * cannot submit multiple reviews against the same purchased line item.
 *
 * No customer account is required to submit a review.
 * The review link is emailed when delivery_status reaches ORDER_DELIVERED_SUCCESSFULLY.
 */
@Entity
@Table(
    name = "reviews",
    indexes = {
        @Index(name = "idx_reviews_item",      columnList = "item_id"),
        @Index(name = "idx_reviews_customer",  columnList = "customer_id"),
        @Index(name = "idx_reviews_submitted", columnList = "submitted_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    /**
     * The specific purchased line item being reviewed.
     * UNIQUE constraint ensures one review per purchased line item.
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_line_item_id", nullable = false, unique = true)
    private SaleLineItem saleLineItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    /**
     * Star rating 1–5.
     * Enforced by CHECK constraint in the database and by service-layer validation.
     */
    @Column(name = "star_rating", nullable = false)
    private Integer starRating;

    /** Optional free-text comment — not required by the client spec. */
    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @CreationTimestamp
    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;
}
