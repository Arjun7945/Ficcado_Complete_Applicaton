package com.aps.ficcado_inventory_sales_management_app.service;

import com.aps.ficcado_inventory_sales_management_app.entity.*;
import com.aps.ficcado_inventory_sales_management_app.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

/**
 * Service for customer product reviews.
 *
 * Review flow:
 *   1. When a sale's delivery_status reaches ORDER_DELIVERED_SUCCESSFULLY,
 *      SaleService (or a dedicated event handler) calls generateAndEmailReviewTokens()
 *      which creates a ReviewToken for each line item and sends the review link by email.
 *   2. The customer opens the link: /review/{token} (public, no login required).
 *   3. The public ReviewSubmissionController validates the token and calls submitReview().
 *   4. submitReview() atomically: saves the Review + updates item.averageRating/reviewCount.
 *      One @Transactional ensures the aggregate is never out of sync with the reviews table.
 *
 * Uniqueness: one review per sale_line_item_id.
 * Same customer CAN review the same item from a different order (different line item ID).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewService {

    private static final int TOKEN_EXPIRY_DAYS = 30;
    private static final int TOKEN_BYTES = 48; // 64-char URL-safe base64

    private final ReviewRepository reviewRepository;
    private final ReviewTokenRepository reviewTokenRepository;
    private final ItemRepository itemRepository;
    private final SaleLineItemRepository saleLineItemRepository;

    // ── Token Generation ──────────────────────────────────────────────────────

    /**
     * Generate a review token for a specific sale line item.
     * Called when delivery_status reaches ORDER_DELIVERED_SUCCESSFULLY.
     *
     * The caller is responsible for emailing the link containing this token
     * to the customer (using the existing Gmail confirmation infrastructure).
     *
     * @return the ReviewToken entity (token string is inside it)
     */
    @Transactional
    public ReviewToken generateReviewToken(SaleLineItem lineItem, Customer customer) {
        // Idempotent: if a token already exists for this line item, return the existing one
        if (reviewTokenRepository.existsBySaleLineItem_Id(lineItem.getId())) {
            log.info("Review token already exists for line item: {} — skipping duplicate",
                    lineItem.getId());
            return reviewTokenRepository.findBySaleLineItem_Id(lineItem.getId()).orElseThrow();
        }

        String rawToken = generateSecureToken();
        Instant expiresAt = Instant.now().plus(TOKEN_EXPIRY_DAYS, ChronoUnit.DAYS);

        ReviewToken reviewToken = ReviewToken.builder()
                .token(rawToken)
                .saleLineItem(lineItem)
                .customer(customer)
                .expiresAt(expiresAt)
                .build();

        ReviewToken saved = reviewTokenRepository.save(reviewToken);
        log.info("Review token generated for line item: {} — expires: {}", lineItem.getId(), expiresAt);
        return saved;
    }

    // ── Token Validation ──────────────────────────────────────────────────────

    /**
     * Validate a token for the public review submission page.
     * Returns the ReviewToken if valid, or empty if:
     *   - Token not found
     *   - Token already used (usedAt IS NOT NULL)
     *   - Token expired (expiresAt < NOW)
     */
    @Transactional(readOnly = true)
    public Optional<ReviewToken> validateToken(String tokenString) {
        return reviewTokenRepository.findByTokenWithLineItemAndItem(tokenString)
                .filter(t -> t.getUsedAt() == null)       // not already used
                .filter(t -> t.getExpiresAt().isAfter(Instant.now())); // not expired
    }

    // ── Review Submission ─────────────────────────────────────────────────────

    /**
     * Submit a review using a validated token.
     *
     * Atomically (single @Transactional):
     *   1. Marks the token as used
     *   2. Saves the Review row
     *   3. Updates item.averageRating and item.reviewCount
     *
     * @param tokenString the raw token from the review link URL
     * @param starRating  1–5
     * @param comment     optional free-text
     * @return the saved Review
     * @throws IllegalArgumentException if token is invalid/expired/already used
     * @throws IllegalStateException    if a review already exists for this line item
     */
    @Transactional
    public Review submitReview(String tokenString, int starRating, String comment) {
        if (starRating < 1 || starRating > 5) {
            throw new IllegalArgumentException("Star rating must be between 1 and 5. Got: " + starRating);
        }

        // Validate and consume the token atomically
        ReviewToken token = reviewTokenRepository.findByToken(tokenString)
                .orElseThrow(() -> new IllegalArgumentException("Review link not found or invalid."));

        if (token.getUsedAt() != null) {
            throw new IllegalStateException("This review link has already been used.");
        }
        if (!token.getExpiresAt().isAfter(Instant.now())) {
            throw new IllegalStateException("This review link has expired.");
        }

        SaleLineItem lineItem = token.getSaleLineItem();

        // Guard against duplicate review
        if (reviewRepository.existsBySaleLineItem_Id(lineItem.getId())) {
            throw new IllegalStateException("A review has already been submitted for this purchase.");
        }

        // Mark token as used
        token.setUsedAt(Instant.now());
        reviewTokenRepository.save(token);

        // Save the review
        Review review = Review.builder()
                .item(lineItem.getItem())
                .saleLineItem(lineItem)
                .customer(token.getCustomer())
                .starRating(starRating)
                .comment(comment)
                .build();
        Review saved = reviewRepository.save(review);

        // Update item aggregate — within the same transaction
        updateItemAggregate(lineItem.getItem().getId());

        log.info("Review submitted: item={}, rating={}, lineItem={}",
                lineItem.getItem().getId(), starRating, lineItem.getId());
        return saved;
    }

    // ── CRM Queries (admin views) ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Review> getReviewsForItem(Long itemId) {
        return reviewRepository.findByItem_IdOrderBySubmittedAtDesc(itemId);
    }

    // ── Aggregate Update ──────────────────────────────────────────────────────

    /**
     * Recalculate and persist item.averageRating and item.reviewCount.
     * Must be called within the same @Transactional as the review insert.
     */
    private void updateItemAggregate(Long itemId) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Item not found: " + itemId));

        List<Review> allReviews = reviewRepository.findByItem_IdOrderBySubmittedAtDesc(itemId);
        int count = allReviews.size();

        BigDecimal average = count > 0
            ? allReviews.stream()
                .map(r -> BigDecimal.valueOf(r.getStarRating()))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        item.setReviewCount(count);
        item.setAverageRating(average);
        itemRepository.save(item);

        log.debug("Updated item {} aggregate: count={}, average={}", itemId, count, average);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String generateSecureToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
