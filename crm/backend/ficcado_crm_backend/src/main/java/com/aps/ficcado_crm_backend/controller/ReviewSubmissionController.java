package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.ReviewDto.ReviewSubmissionResponse;
import com.aps.ficcado_crm_backend.dto.ReviewDto.ReviewTokenValidationResponse;
import com.aps.ficcado_crm_backend.dto.ReviewDto.SubmitReviewRequest;
import com.aps.ficcado_crm_backend.entity.Review;
import com.aps.ficcado_crm_backend.entity.ReviewToken;
import com.aps.ficcado_crm_backend.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
@org.springframework.validation.annotation.Validated
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
        log.debug("Validating review token: {}", token);
        Optional<ReviewToken> reviewToken = reviewService.validateToken(token);
        if (reviewToken.isEmpty()) {
            org.springframework.http.ProblemDetail pd = org.springframework.http.ProblemDetail.forStatusAndDetail(
                    org.springframework.http.HttpStatus.GONE,
                    "This review link is invalid, has already been used, or has expired.");
            pd.setType(java.net.URI.create("urn:ficcado:review-link-expired"));
            pd.setTitle("Review Link Expired");
            pd.setProperty("error", "This review link is invalid, has already been used, or has expired.");
            pd.setProperty("timestamp", java.time.Instant.now());
            return ResponseEntity.status(org.springframework.http.HttpStatus.GONE).body(pd);
        }

        ReviewToken rt = reviewToken.get();
        return ResponseEntity.ok(new ReviewTokenValidationResponse(
            true,
            rt.getSaleLineItem().getItem().getItemName(),
            rt.getSaleLineItem().getItem().getId(),
            rt.getExpiresAt().toString()
        ));
    }

    /**
     * Submit a review using a tokenized link.
     * The token is consumed (marked used_at = NOW) on successful submission.
     */
    @PostMapping("/submit")
    @Operation(summary = "Submit a review via tokenized link (no auth required)")
    public ResponseEntity<ReviewSubmissionResponse> submitReview(@Valid @RequestBody SubmitReviewRequest request) {
        log.info("Submitting review for token with starRating: {}", request.starRating());
        Review review = reviewService.submitReview(request.token(), request.starRating(), request.comment());
        return ResponseEntity.ok(new ReviewSubmissionResponse(
            "Thank you! Your review has been submitted.",
            review.getId(),
            review.getStarRating()
        ));
    }
}
