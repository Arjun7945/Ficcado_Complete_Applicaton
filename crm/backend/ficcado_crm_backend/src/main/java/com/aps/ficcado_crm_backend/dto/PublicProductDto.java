package com.aps.ficcado_crm_backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Public Storefront Product Data Transfer Objects.
 *
 * Strictly sanitized:
 * - NEVER exposes cost_price, vendor details, or supplier info.
 * - Stock is exposed only as boolean availability per size (sizeStock) and overall (inStock),
 *   never revealing exact warehouse inventory quantities.
 */
public class PublicProductDto {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PublicProductResponse(
            Long id,
            String name,
            String slug,
            String type,
            String category,
            BigDecimal price,
            BigDecimal rating,
            Integer reviews,
            List<String> sizes,
            Map<String, Boolean> sizeStock,
            List<String> colors,
            String desc,
            String description,
            String img,
            String flatImg,
            List<String> images,
            boolean inStock,
            boolean featured,
            boolean active,
            Integer sortOrder
    ) {}

    public record PublicCategoryResponse(
            String id,
            String name,
            String slug,
            String img,
            String status,
            String description,
            Integer sortOrder,
            long productCount
    ) {}

    public record PublicReviewResponse(
            String id,
            Long productId,
            String author,
            int rating,
            String date,
            String title,
            String comment,
            boolean verified,
            String sizeBought
    ) {}

    public record ApiResponse<T>(
            boolean success,
            T data,
            String message
    ) {
        public static <T> ApiResponse<T> ok(T data) {
            return new ApiResponse<>(true, data, null);
        }

        public static <T> ApiResponse<T> ok(T data, String message) {
            return new ApiResponse<>(true, data, message);
        }

        public static <T> ApiResponse<T> error(String message) {
            return new ApiResponse<>(false, null, message);
        }
    }
}
