package com.aps.ficcado_crm_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Represents a revoked JWT token stored in the server-side denylist.
 *
 * Per-device logout: each token entry corresponds to a single browser/device session.
 * Revoking one token does NOT affect other concurrent sessions for the same admin
 * (they hold different tokens that are not in this table).
 *
 * Storage model: we store SHA-256(token) rather than the raw JWT to keep the row
 * short and to avoid storing anything that could be replayed if the table were leaked.
 *
 * Cleanup: entries with expires_at < NOW() are safe to delete — an expired token
 * would be rejected by JWT validation before the denylist check anyway.
 */
@Entity
@Table(
    name = "revoked_tokens",
    indexes = {
        @Index(name = "idx_revoked_tokens_hash",       columnList = "token_hash"),
        @Index(name = "idx_revoked_tokens_expires_at", columnList = "expires_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RevokedToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * SHA-256 hex digest of the raw JWT string.
     * 64-character hex string (fixed-length, indexed for fast lookup).
     */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    /**
     * Which admin this token belonged to — informational, for audit purposes.
     * Nullable: if the admin row is deleted, we still want to keep the denylist entry
     * until it naturally expires.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id")
    private Admin admin;

    /**
     * When this token was revoked (logout time).
     */
    @CreationTimestamp
    @Column(name = "revoked_at", nullable = false, updatable = false)
    private Instant revokedAt;

    /**
     * Copied from the JWT's "exp" claim. Used for safe cleanup:
     * entries whose expires_at is in the past can be pruned without
     * affecting security (the JWT itself would already be rejected as expired).
     */
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}
