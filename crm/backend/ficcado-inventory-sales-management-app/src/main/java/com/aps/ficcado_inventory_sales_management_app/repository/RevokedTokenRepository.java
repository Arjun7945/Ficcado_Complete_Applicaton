package com.aps.ficcado_inventory_sales_management_app.repository;

import com.aps.ficcado_inventory_sales_management_app.entity.RevokedToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;

/**
 * Repository for the server-side JWT denylist.
 *
 * Used for per-device logout: each row represents a single revoked token
 * (one browser/device session). Revoking one token does NOT affect other
 * concurrent sessions — they hold different, non-revoked tokens.
 */
@Repository
public interface RevokedTokenRepository extends JpaRepository<RevokedToken, Long> {

    /**
     * Denylist check — called on every authenticated request.
     * Returns true if the token's SHA-256 hash is in the revocation table.
     */
    boolean existsByTokenHash(String tokenHash);

    /**
     * Prune expired entries. Safe to run at startup and periodically scheduled.
     * An expired JWT would be rejected by JWT signature/expiry validation before
     * the denylist check is reached anyway, so removing these rows is safe.
     */
    @Modifying
    @Query("DELETE FROM RevokedToken rt WHERE rt.expiresAt < :now")
    int deleteByExpiresAtBefore(Instant now);
}
