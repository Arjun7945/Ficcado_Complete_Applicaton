package com.aps.ficcado_inventory_sales_management_app.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Short-lived, cryptographically random token emailed to a customer
 * after their order reaches ORDER_DELIVERED_SUCCESSFULLY.
 *
 * The token links to a minimal, no-login public review submission page.
 *
 * used_at IS NULL  → token is valid and has not been used yet
 * used_at NOT NULL → token has already been consumed; reject re-submission
 *
 * Tokens expire after 30 days (enforced by ReviewService on submission).
 */
@Entity
@Table(
    name = "review_tokens",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_review_tokens_sale_line_item", columnNames = {"sale_line_item_id"})
    },
    indexes = {
        @Index(name = "idx_review_tokens_token",      columnList = "token"),
        @Index(name = "idx_review_tokens_line_item",  columnList = "sale_line_item_id"),
        @Index(name = "idx_review_tokens_expires_at", columnList = "expires_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Cryptographically random, URL-safe token string.
     * Sent in the review link: /review/{token}
     */
    @Column(name = "token", nullable = false, unique = true, length = 128)
    private String token;

    /** The specific purchased line item this review token covers. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_line_item_id", nullable = false)
    private SaleLineItem saleLineItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    /** When this token expires — 30 days from creation. */
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /**
     * When this token was consumed by a review submission.
     * NULL = not yet used (valid). NOT NULL = already used (reject).
     */
    @Column(name = "used_at")
    private Instant usedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
