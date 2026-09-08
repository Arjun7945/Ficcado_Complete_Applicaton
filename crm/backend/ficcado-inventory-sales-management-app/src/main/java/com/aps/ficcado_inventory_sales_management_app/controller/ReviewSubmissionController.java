package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.Review;
import com.aps.ficcado_inventory_sales_management_app.entity.ReviewToken;
import com.aps.ficcado_inventory_sales_management_app.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/**
 * Public (no authentication required) endpoint for review submission.
 *
 * Accessed via the tokenized link emailed to the customer:
 *   POST /api/public/reviews/submit
 *
 * Token validation:
 *   - Token must exist
 *   - Token must not already be used (usedAt IS NULL)
 *   - Token must not be expired (expiresAt > NOW)
 *
 * On success: token is marked as used, review is saved, item aggregate is updated —
 * all within a single @Transactional in ReviewService.
 *
 * This endpoint is deliberately minimal. It does NOT expose admin data.
 */
@RestController
@RequestMapping("/api/public/reviews")
@Tag(name = "Reviews (Public — no auth)")
@RequiredArgsConstructor
public class ReviewSubmissionController {

    private final ReviewService reviewService;

    /**
     * Validate a review token and return basic info about what item is being reviewed.
     * Called when the customer opens the review link — before they submit.
     */
    @GetMapping("/validate/{token}")
    @Operation(summary = "Validate a review token (no auth required)")
    public ResponseEntity<?> validateToken(@PathVariable String token) {
        Optional<ReviewToken> reviewToken = reviewService.validateToken(token);
        if (reviewToken.isEmpty()) {
            return ResponseEntity.status(410).body(Map.of(
                "error", "This review link is invalid, has already been used, or has expired."
            ));
        }
        ReviewToken rt = reviewToken.get();
        return ResponseEntity.ok(Map.of(
            "valid", true,
            "itemName", rt.getSaleLineItem().getItem().getItemName(),
            "itemId",   rt.getSaleLineItem().getItem().getId(),
            "expiresAt", rt.getExpiresAt().toString()
        ));
    }

    /**
     * Submit a review using a tokenized link.
     * The token is consumed (marked used_at = NOW) on successful submission.
     */
    @PostMapping("/submit")
    @Operation(summary = "Submit a review via tokenized link (no auth required)")
    public ResponseEntity<?> submitReview(@RequestBody SubmitReviewRequest request) {
        if (request.token() == null || request.token().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Token is required."));
        }
        try {
            Review review = reviewService.submitReview(request.token(), request.starRating(), request.comment());
            return ResponseEntity.ok(Map.of(
                "message", "Thank you! Your review has been submitted.",
                "reviewId", review.getId(),
                "starRating", review.getStarRating()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
    }

    /** Request body for review submission. */
    record SubmitReviewRequest(String token, int starRating, String comment) {}
}
