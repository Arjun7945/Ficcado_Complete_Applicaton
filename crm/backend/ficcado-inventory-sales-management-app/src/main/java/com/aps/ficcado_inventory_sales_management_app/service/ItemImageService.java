package com.aps.ficcado_inventory_sales_management_app.service;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.Item;
import com.aps.ficcado_inventory_sales_management_app.entity.ItemImage;
import com.aps.ficcado_inventory_sales_management_app.repository.ItemImageRepository;
import com.aps.ficcado_inventory_sales_management_app.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * Service for managing item images stored in Cloudflare R2.
 *
 * Upload behaviour:
 *   - Max 10 images per item
 *   - Each upload generates a full-resolution and a thumbnail in R2
 *   - display_order is assigned as (current max + 1); position 1 is the cover image
 *
 * Reorder: admin supplies the full ordered list of image IDs; display_order is
 * re-assigned 1…N in that sequence.
 *
 * Delete: removes the R2 objects (full + thumbnail) and the item_images row.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ItemImageService {

    private static final int MAX_IMAGES_PER_ITEM = 10;

    private final ItemImageRepository itemImageRepository;
    private final ItemRepository itemRepository;
    private final MediaStorageService mediaStorageService;
    private final ActivityLogService activityLogService;

    // ── Upload ────────────────────────────────────────────────────────────────

    @Transactional
    public ItemImage uploadImage(Long itemId, MultipartFile file, String caption,
                                 Admin uploadedBy) throws IOException {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Item not found: " + itemId));

        int currentCount = itemImageRepository.countByItemId(itemId);
        if (currentCount >= MAX_IMAGES_PER_ITEM) {
            throw new IllegalStateException(
                "Item already has " + currentCount + " images. Maximum is " + MAX_IMAGES_PER_ITEM + ".");
        }

        // Upload to R2 — context path: items/{itemId}
        String context = "items/" + itemId;
        MediaStorageService.UploadResult result = mediaStorageService.uploadImage(file, context);

        int nextOrder = itemImageRepository.findMaxDisplayOrderByItemId(itemId) + 1;

        ItemImage image = ItemImage.builder()
                .item(item)
                .imageUrl(result.imageUrl())
                .thumbnailUrl(result.thumbnailUrl())
                .caption(caption)
                .displayOrder(nextOrder)
                .uploadedBy(uploadedBy)
                .build();

        ItemImage saved = itemImageRepository.save(image);

        activityLogService.log(uploadedBy, "CREATE", "ITEMS", "item_images",
                itemId.toString(), "Image uploaded for item: " + item.getItemName());

        return saved;
    }

    // ── Reorder ───────────────────────────────────────────────────────────────

    /**
     * Re-assign display_order to match the caller-supplied ordered list of image IDs.
     * The first ID in the list becomes display_order=1 (cover image).
     *
     * @param itemId          the item whose images are being reordered
     * @param orderedImageIds image IDs in the desired display order
     */
    @Transactional
    public List<ItemImage> reorderImages(Long itemId, List<Long> orderedImageIds, Admin admin) {
        List<ItemImage> images = itemImageRepository.findByItemIdOrderByDisplayOrderAsc(itemId);

        // Validate that all supplied IDs belong to this item
        for (Long imageId : orderedImageIds) {
            boolean belongs = images.stream().anyMatch(img -> img.getId().equals(imageId));
            if (!belongs) {
                throw new IllegalArgumentException(
                    "Image ID " + imageId + " does not belong to item " + itemId);
            }
        }

        // Re-assign display_order based on position in the supplied list
        for (int i = 0; i < orderedImageIds.size(); i++) {
            final int order = i + 1;
            final Long imageId = orderedImageIds.get(i);
            images.stream()
                  .filter(img -> img.getId().equals(imageId))
                  .findFirst()
                  .ifPresent(img -> img.setDisplayOrder(order));
        }

        return itemImageRepository.saveAll(images);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    @Transactional
    public void deleteImage(Long imageId, Admin admin) {
        ItemImage image = itemImageRepository.findById(imageId)
                .orElseThrow(() -> new IllegalArgumentException("Image not found: " + imageId));

        Long itemId = image.getItem().getId();

        // Delete from R2 first, then remove the DB row
        mediaStorageService.deleteImage(image.getImageUrl(), image.getThumbnailUrl());
        itemImageRepository.delete(image);

        // Re-number remaining images to close gaps
        resequenceAfterDelete(itemId);

        activityLogService.log(admin, "DELETE", "ITEMS", "item_images",
                itemId.toString(), "Image deleted for item ID: " + itemId);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ItemImage> getImagesForItem(Long itemId) {
        return itemImageRepository.findByItemIdOrderByDisplayOrderAsc(itemId);
    }

    /**
     * Get the cover (position-1) image URL for an item, or null if no images.
     * Used to render thumbnails across the CRM wherever items are referenced.
     */
    @Transactional(readOnly = true)
    public String getCoverThumbnailUrl(Long itemId) {
        return itemImageRepository.findByItemIdOrderedByDisplayOrder(itemId)
                .stream()
                .findFirst()
                .map(ItemImage::getThumbnailUrl)
                .orElse(null);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Re-number display_order sequentially after a deletion to close gaps. */
    private void resequenceAfterDelete(Long itemId) {
        List<ItemImage> remaining = itemImageRepository.findByItemIdOrderByDisplayOrderAsc(itemId);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setDisplayOrder(i + 1);
        }
        itemImageRepository.saveAll(remaining);
    }
}
