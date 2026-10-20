package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.ItemDto.ItemImageDto;
import com.aps.ficcado_crm_backend.dto.ItemDto.ItemResponse;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.ItemImage;
import com.aps.ficcado_crm_backend.entity.ItemSize;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

public final class ItemMapper {

    private ItemMapper() {}

    public static ItemImageDto toImageDto(ItemImage img) {
        if (img == null) return null;
        return new ItemImageDto(
                img.getId(),
                img.getImageUrl(),
                img.getThumbnailUrl(),
                img.getCaption(),
                img.getDisplayOrder()
        );
    }

    public static List<ItemImageDto> toImageDtoList(List<ItemImage> images) {
        if (images == null) return Collections.emptyList();
        return images.stream().map(ItemMapper::toImageDto).toList();
    }

    public static ItemResponse toResponse(Item item) {
        if (item == null) return null;

        String coverUrl = (item.getImages() != null && !item.getImages().isEmpty())
                ? item.getImages().stream()
                .min((a, b) -> Integer.compare(
                        a.getDisplayOrder() != null ? a.getDisplayOrder() : 99,
                        b.getDisplayOrder() != null ? b.getDisplayOrder() : 99))
                .map(ItemImage::getThumbnailUrl)
                .orElse(null)
                : null;

        List<ItemImageDto> imageDtos = toImageDtoList(item.getImages());

        List<String> sizes = item.getSizes() != null
                ? item.getSizes().stream().map(ItemSize::getSize).sorted().toList()
                : Collections.emptyList();

        return new ItemResponse(
                item.getId(),
                item.getItemName(),
                item.getItemType(),
                item.getPriceOfItem(),
                item.getCostPrice(),
                item.getCurrentStatus() != null ? item.getCurrentStatus().name() : null,
                sizes,
                coverUrl,
                item.getAverageRating() != null ? item.getAverageRating() : BigDecimal.ZERO,
                item.getReviewCount() != null ? item.getReviewCount() : 0,
                imageDtos
        );
    }
}
