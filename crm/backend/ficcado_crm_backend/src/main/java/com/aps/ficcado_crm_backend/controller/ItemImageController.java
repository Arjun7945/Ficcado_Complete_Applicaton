package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.ItemDto.ItemImageDto;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.ItemImage;
import com.aps.ficcado_crm_backend.mapper.ItemMapper;
import com.aps.ficcado_crm_backend.service.ItemImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
@RestController
@RequestMapping("/api/items/{itemId}/images")
@Tag(name = "Item Images")
@RequiredArgsConstructor
public class ItemImageController {

    private final ItemImageService itemImageService;

    @GetMapping
    @Operation(summary = "List all images for an item, ordered by display_order")
    public ResponseEntity<List<ItemImageDto>> getImages(@PathVariable Long itemId) {
        log.debug("Fetching images for item [itemId={}]", itemId);
        List<ItemImage> images = itemImageService.getImagesForItem(itemId);
        return ResponseEntity.ok(ItemMapper.toImageDtoList(images));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a new image for an item (generates full + thumbnail in R2)")
    public ResponseEntity<ItemImageDto> uploadImage(
            @PathVariable Long itemId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption,
            @AuthenticationPrincipal Admin admin) throws IOException {
        log.info("Uploading image for item [itemId={}], filename: {}", itemId, file.getOriginalFilename());
        ItemImage image = itemImageService.uploadImage(itemId, file, caption, admin);
        return ResponseEntity.ok(ItemMapper.toImageDto(image));
    }

    @PutMapping("/reorder")
    @Operation(summary = "Reorder images — supply full ordered list of image IDs")
    public ResponseEntity<List<ItemImageDto>> reorderImages(
            @PathVariable Long itemId,
            @RequestBody List<Long> orderedImageIds,
            @AuthenticationPrincipal Admin admin) {
        log.info("Reordering images for item [itemId={}], count: {}", itemId, orderedImageIds.size());
        List<ItemImage> reordered = itemImageService.reorderImages(itemId, orderedImageIds, admin);
        return ResponseEntity.ok(ItemMapper.toImageDtoList(reordered));
    }

    @DeleteMapping("/{imageId}")
    @Operation(summary = "Delete a specific image (removes from R2 and database)")
    public ResponseEntity<Map<String, String>> deleteImage(
            @PathVariable Long itemId,
            @PathVariable Long imageId,
            @AuthenticationPrincipal Admin admin) {
        log.info("Deleting image [id={}] from item [itemId={}]", imageId, itemId);
        itemImageService.deleteImage(imageId, admin);
        return ResponseEntity.ok(Map.of("message", "Image deleted successfully"));
    }
}
