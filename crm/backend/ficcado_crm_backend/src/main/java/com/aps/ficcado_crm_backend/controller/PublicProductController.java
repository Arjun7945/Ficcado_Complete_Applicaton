package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.PublicProductDto.ApiResponse;
import com.aps.ficcado_crm_backend.dto.PublicProductDto.PublicCategoryResponse;
import com.aps.ficcado_crm_backend.dto.PublicProductDto.PublicProductResponse;
import com.aps.ficcado_crm_backend.dto.PublicProductDto.PublicReviewResponse;
import com.aps.ficcado_crm_backend.service.PublicProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public Storefront Product & Catalog Controller.
 *
 * Exposes read-only catalog data for the Ficcado website via the NGINX Gateway.
 * Fully unauthenticated (permitAll).
 * Completely sanitized: No cost price, internal supplier IDs, or exact warehouse numbers are exposed.
 */
@Slf4j
@RestController
@RequestMapping("/api/public")
@Tag(name = "Public Catalog (Storefront)")
@RequiredArgsConstructor
public class PublicProductController {

    private final PublicProductService publicProductService;

    @GetMapping("/products")
    @Operation(summary = "List public storefront products with optional category, stock, and search filtering")
    public ResponseEntity<ApiResponse<List<PublicProductResponse>>> getProducts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false, defaultValue = "false") boolean includeOutOfStock,
            @RequestParam(required = false) String search) {
        log.info("Public REST request for catalog products [category={}, includeOutOfStock={}, search={}]",
                category, includeOutOfStock, search);

        List<PublicProductResponse> products = publicProductService.getAllPublicProducts(category, includeOutOfStock, search);
        return ResponseEntity.ok(ApiResponse.ok(products));
    }

    @GetMapping("/products/{id}")
    @Operation(summary = "Get single product by ID for storefront display")
    public ResponseEntity<ApiResponse<PublicProductResponse>> getProductById(@PathVariable Long id) {
        log.info("Public REST request for product [id={}]", id);

        return publicProductService.getPublicProductById(id)
                .map(product -> ResponseEntity.ok(ApiResponse.ok(product)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/products/by-slug/{slug}")
    @Operation(summary = "Get single product by URL slug for storefront product detail page")
    public ResponseEntity<ApiResponse<PublicProductResponse>> getProductBySlug(@PathVariable String slug) {
        log.info("Public REST request for product by slug [{}]", slug);

        return publicProductService.getPublicProductBySlug(slug)
                .map(product -> ResponseEntity.ok(ApiResponse.ok(product)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/products/{id}/reviews")
    @Operation(summary = "Get public verified reviews for a product")
    public ResponseEntity<ApiResponse<List<PublicReviewResponse>>> getProductReviews(@PathVariable Long id) {
        log.info("Public REST request for product reviews [itemId={}]", id);

        List<PublicReviewResponse> reviews = publicProductService.getPublicReviewsForItem(id);
        return ResponseEntity.ok(ApiResponse.ok(reviews));
    }

    @GetMapping("/categories")
    @Operation(summary = "List public storefront categories with live item counts")
    public ResponseEntity<ApiResponse<List<PublicCategoryResponse>>> getCategories() {
        log.info("Public REST request for storefront categories");

        List<PublicCategoryResponse> categories = publicProductService.getPublicCategories();
        return ResponseEntity.ok(ApiResponse.ok(categories));
    }
}
