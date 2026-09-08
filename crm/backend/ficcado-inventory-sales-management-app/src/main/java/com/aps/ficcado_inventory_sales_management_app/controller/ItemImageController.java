package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.ItemImage;
import com.aps.ficcado_inventory_sales_management_app.service.ItemImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * REST endpoints for item image management (upload, reorder, delete).
 * All endpoints require authentication (admin session cookie).
 */
@RestController
@RequestMapping("/api/items/{itemId}/images")
@Tag(name = "Item Images")
@RequiredArgsConstructor
public class ItemImageController {

    private final ItemImageService itemImageService;

    @GetMapping
    @Operation(summary = "List all images for an item, ordered by display_order")
    public ResponseEntity<List<ItemImage>> getImages(@PathVariable Long itemId) {
        return ResponseEntity.ok(itemImageService.getImagesForItem(itemId));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a new image for an item (generates full + thumbnail in R2)")
    public ResponseEntity<?> uploadImage(
            @PathVariable Long itemId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption,
            @AuthenticationPrincipal Admin admin) {

        try {
            ItemImage image = itemImageService.uploadImage(itemId, file, caption, admin);
            return ResponseEntity.ok(image);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Image upload failed: " + e.getMessage()));
        }
    }

    @PutMapping("/reorder")
    @Operation(summary = "Reorder images — supply full ordered list of image IDs")
    public ResponseEntity<?> reorderImages(
            @PathVariable Long itemId,
            @RequestBody List<Long> orderedImageIds,
            @AuthenticationPrincipal Admin admin) {
        try {
            List<ItemImage> reordered = itemImageService.reorderImages(itemId, orderedImageIds, admin);
            return ResponseEntity.ok(reordered);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{imageId}")
    @Operation(summary = "Delete a specific image (removes from R2 and database)")
    public ResponseEntity<?> deleteImage(
            @PathVariable Long itemId,
            @PathVariable Long imageId,
            @AuthenticationPrincipal Admin admin) {
        try {
            itemImageService.deleteImage(imageId, admin);
            return ResponseEntity.ok(Map.of("message", "Image deleted successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
