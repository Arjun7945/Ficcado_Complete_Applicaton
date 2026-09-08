package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.Item;
import com.aps.ficcado_inventory_sales_management_app.entity.ItemSize;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.ItemStatus;
import com.aps.ficcado_inventory_sales_management_app.repository.ItemRepository;
import com.aps.ficcado_inventory_sales_management_app.service.ItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/items")
@Tag(name = "Items")
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @GetMapping
    @Operation(summary = "List all items")
    public List<ItemResponse> getAll() {
        return itemService.getAll().stream().map(ItemResponse::from).toList();
    }

    @GetMapping("/active")
    @Operation(summary = "List active items with sizes (for sale dropdowns)")
    public List<ItemResponse> getActive() {
        return itemService.getActiveItemsWithSizes()
                .stream().map(ItemResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get item by ID")
    public ResponseEntity<ItemResponse> getById(@PathVariable Long id) {
        return itemService.getById(id)
                .map(ItemResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create item")
    public ResponseEntity<ItemResponse> create(@RequestBody ItemRequest request,
                                               @AuthenticationPrincipal Admin admin) {
        Item saved = itemService.createItem(
                request.itemName(),
                request.itemType(),
                request.priceOfItem(),
                request.costPrice(),
                request.sizes(),
                admin
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ItemResponse.from(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update item")
    public ResponseEntity<ItemResponse> update(@PathVariable Long id,
                                               @RequestBody ItemRequest request,
                                               @AuthenticationPrincipal Admin admin) {
        return itemService.updateItem(
                id,
                request.itemName(),
                request.itemType(),
                request.priceOfItem(),
                request.costPrice(),
                request.sizes(),
                admin
        ).map(ItemResponse::from)
         .map(ResponseEntity::ok)
         .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Toggle item status ACTIVE/INACTIVE")
    public ResponseEntity<ItemResponse> toggleStatus(@PathVariable Long id,
                                                     @RequestBody Map<String, String> body,
                                                     @AuthenticationPrincipal Admin admin) {
        ItemStatus newStatus = ItemStatus.fromString(body.get("status"));
        return itemService.toggleStatus(id, newStatus, admin)
                .map(ItemResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete item by ID")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal Admin admin) {
        boolean deleted = itemService.deleteItem(id, admin);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    record ItemRequest(String itemName, String itemType,
                       BigDecimal priceOfItem, BigDecimal costPrice,
                       List<String> sizes) {}

    record ItemImageDto(Long id, String imageUrl, String thumbnailUrl, String caption, Integer displayOrder) {
        static ItemImageDto from(com.aps.ficcado_inventory_sales_management_app.entity.ItemImage img) {
            return new ItemImageDto(img.getId(), img.getImageUrl(), img.getThumbnailUrl(), img.getCaption(), img.getDisplayOrder());
        }
    }

    record ItemResponse(Long id, String itemName, String itemType,
                        BigDecimal priceOfItem, BigDecimal costPrice,
                        String currentStatus, List<String> sizes,
                        String coverThumbnailUrl, BigDecimal averageRating, Integer reviewCount,
                        List<ItemImageDto> images) {
        static ItemResponse from(Item item) {
            String coverUrl = (item.getImages() != null && !item.getImages().isEmpty())
                    ? item.getImages().stream()
                        .min((a, b) -> Integer.compare(
                            a.getDisplayOrder() != null ? a.getDisplayOrder() : 99,
                            b.getDisplayOrder() != null ? b.getDisplayOrder() : 99))
                        .map(com.aps.ficcado_inventory_sales_management_app.entity.ItemImage::getThumbnailUrl)
                        .orElse(null)
                    : null;

            List<ItemImageDto> imageDtos = (item.getImages() != null)
                    ? item.getImages().stream().map(ItemImageDto::from).toList()
                    : List.of();

            return new ItemResponse(
                    item.getId(), item.getItemName(), item.getItemType(),
                    item.getPriceOfItem(), item.getCostPrice(),
                    item.getCurrentStatus().name(),
                    item.getSizes().stream().map(ItemSize::getSize).sorted().toList(),
                    coverUrl,
                    item.getAverageRating() != null ? item.getAverageRating() : BigDecimal.ZERO,
                    item.getReviewCount() != null ? item.getReviewCount() : 0,
                    imageDtos);
        }
    }
}

