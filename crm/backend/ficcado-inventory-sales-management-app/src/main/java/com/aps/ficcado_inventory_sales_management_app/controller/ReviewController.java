package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.Review;
import com.aps.ficcado_inventory_sales_management_app.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Authenticated CRM endpoint for viewing product reviews per item.
 * Admins can see all reviews and aggregate ratings from this endpoint.
 * (Actual review submission is handled by the public ReviewSubmissionController.)
 */
@RestController
@RequestMapping("/api/reviews")
@Tag(name = "Reviews (CRM)")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping("/items/{itemId}")
    @Operation(summary = "Get all reviews for an item (authenticated CRM view)")
    public ResponseEntity<List<Review>> getReviewsForItem(@PathVariable Long itemId) {
        return ResponseEntity.ok(reviewService.getReviewsForItem(itemId));
    }
}
