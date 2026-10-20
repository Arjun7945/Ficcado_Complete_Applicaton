package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.ReviewToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface ReviewTokenRepository extends JpaRepository<ReviewToken, Long> {

    /** Look up a token for validation on the public review submission page. */
    Optional<ReviewToken> findByToken(String token);

    /**
     * Eagerly fetch line item and item details to prevent LazyInitializationException
     * when accessed outside a transaction with open-in-view: false (BE-006).
     */
    @Query("""
        SELECT rt FROM ReviewToken rt
        JOIN FETCH rt.saleLineItem sli
        JOIN FETCH sli.item
        WHERE rt.token = :token
    """)
    Optional<ReviewToken> findByTokenWithLineItemAndItem(@Param("token") String token);

    /** Check if a token already exists for a given line item (prevent duplicates). */
    boolean existsBySaleLineItem_Id(Long saleLineItemId);

    /** Find a token for a given line item. */
    Optional<ReviewToken> findBySaleLineItem_Id(Long saleLineItemId);

    /**
     * Prune expired and used tokens for housekeeping.
     * Safe to run periodically — no security impact.
     */
    @Modifying
    @Query("DELETE FROM ReviewToken rt WHERE rt.expiresAt < :now AND rt.usedAt IS NOT NULL")
    int deleteConsumedAndExpired(@Param("now") Instant now);
}
