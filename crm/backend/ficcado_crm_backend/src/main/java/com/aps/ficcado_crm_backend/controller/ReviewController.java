package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.ReviewDto.ReviewResponse;
import com.aps.ficcado_crm_backend.mapper.ReviewMapper;
import com.aps.ficcado_crm_backend.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Authenticated CRM endpoint for viewing product reviews per item.
 * Admins can see all reviews and aggregate ratings from this endpoint.
 * (Actual review submission is handled by the public ReviewSubmissionController.)
 */
@Slf4j
@RestController
@RequestMapping("/api/reviews")
@Tag(name = "Reviews (CRM)")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping("/items/{itemId}")
    @Operation(summary = "Get all reviews for an item (authenticated CRM view)")
    public ResponseEntity<List<ReviewResponse>> getReviewsForItem(@PathVariable Long itemId) {
        log.debug("Fetching reviews for item [itemId={}]", itemId);
        List<ReviewResponse> list = reviewService.getReviewsForItem(itemId).stream()
                .map(ReviewMapper::toResponse)
                .toList();
        return ResponseEntity.ok(list);
    }
}
