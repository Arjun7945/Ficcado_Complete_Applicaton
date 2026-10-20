package com.aps.ficcado_crm_backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

/**
 * Data Transfer Objects for the Review module.
 */
public class ReviewDto {

    public record SubmitReviewRequest(
            @NotBlank(message = "Token is required")
            String token,

            @Min(value = 1, message = "Star rating must be at least 1")
            @Max(value = 5, message = "Star rating cannot exceed 5")
            int starRating,

            String comment
    ) {}

    public record ReviewTokenValidationResponse(
            boolean valid,
            String itemName,
            Long itemId,
            String expiresAt
    ) {}

    public record ReviewSubmissionResponse(
            String message,
            Long reviewId,
            int starRating
    ) {}

    public record ReviewResponse(
            Long id,
            Long itemId,
            String itemName,
            Long customerId,
            String customerName,
            int starRating,
            String comment,
            Instant submittedAt
    ) {}
}
