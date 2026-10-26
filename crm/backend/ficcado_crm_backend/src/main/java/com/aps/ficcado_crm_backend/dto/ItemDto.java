package com.aps.ficcado_crm_backend.dto;

import com.aps.ficcado_crm_backend.entity.enums.ItemStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.List;

/**
 * Data Transfer Objects for Item and ItemImage modules.
 */
public class ItemDto {

    public record ItemRequest(
            @NotBlank(message = "Item name is required") String itemName,
            @NotBlank(message = "Item type is required") String itemType,
            @NotNull(message = "Price of item is required")
            @PositiveOrZero(message = "Price must be 0 or greater") BigDecimal priceOfItem,
            @PositiveOrZero(message = "Cost price must be 0 or greater") BigDecimal costPrice,
            List<String> sizes,
            List<String> availableSizes,
            String currentStatus,
            String description,
            List<String> colors,
            List<String> tags,
            Long version
    ) {
        public ItemRequest(String itemName, String itemType, BigDecimal priceOfItem, BigDecimal costPrice,
                           List<String> sizes, List<String> availableSizes, String currentStatus) {
            this(itemName, itemType, priceOfItem, costPrice, sizes, availableSizes, currentStatus, null, null, null, null);
        }

        public List<String> effectiveSizes() {
            if (sizes != null && !sizes.isEmpty()) return sizes;
            if (availableSizes != null && !availableSizes.isEmpty()) return availableSizes;
            return sizes != null ? sizes : (availableSizes != null ? availableSizes : List.of());
        }

        public ItemStatus effectiveStatus() {
            if (currentStatus == null || currentStatus.isBlank()) return null;
            return ItemStatus.fromString(currentStatus);
        }
    }

    public record StatusToggleRequest(
            @NotBlank(message = "Status is required") String status
    ) {}

    public record ItemImageDto(
            Long id,
            String imageUrl,
            String thumbnailUrl,
            String caption,
            Integer displayOrder
    ) {}

    public record ItemResponse(
            Long id,
            String itemName,
            String itemType,
            BigDecimal priceOfItem,
            BigDecimal costPrice,
            String currentStatus,
            List<String> sizes,
            String coverThumbnailUrl,
            BigDecimal averageRating,
            Integer reviewCount,
            List<ItemImageDto> images,
            String description,
            List<String> colors,
            List<String> tags,
            Long version
    ) {
        public ItemResponse(Long id, String itemName, String itemType, BigDecimal priceOfItem,
                            BigDecimal costPrice, String currentStatus, List<String> sizes,
                            String coverThumbnailUrl, BigDecimal averageRating, Integer reviewCount,
                            List<ItemImageDto> images) {
            this(id, itemName, itemType, priceOfItem, costPrice, currentStatus, sizes, coverThumbnailUrl,
                 averageRating, reviewCount, images, null, List.of(), List.of(), 0L);
        }
    }
}
