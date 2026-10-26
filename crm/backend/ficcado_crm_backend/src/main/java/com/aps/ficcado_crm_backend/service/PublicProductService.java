package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.dto.PublicProductDto.PublicCategoryResponse;
import com.aps.ficcado_crm_backend.dto.PublicProductDto.PublicProductResponse;
import com.aps.ficcado_crm_backend.dto.PublicProductDto.PublicReviewResponse;
import com.aps.ficcado_crm_backend.entity.Inventory;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.ItemColor;
import com.aps.ficcado_crm_backend.entity.ItemImage;
import com.aps.ficcado_crm_backend.entity.ItemSize;
import com.aps.ficcado_crm_backend.entity.ItemTag;
import com.aps.ficcado_crm_backend.entity.Review;
import com.aps.ficcado_crm_backend.entity.enums.ItemStatus;
import com.aps.ficcado_crm_backend.repository.InventoryRepository;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for public storefront product catalog queries.
 *
 * Rules:
 * - Read-only access to Item, ItemImage, ItemSize, and Inventory availability.
 * - Sanitized DTOs: costPrice and sensitive supplier data are never exposed.
 * - Stock is surfaced as boolean availability (inStock & sizeStock), never raw warehouse counts.
 * - Caching backed by Redis (or in-memory fallback) with 10-minute TTL.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PublicProductService {

    private final ItemRepository itemRepository;
    private final InventoryRepository inventoryRepository;
    private final ReviewService reviewService;

    // Static Category Metadata (Single source of truth matching website storefront)
    private static final List<CategoryMeta> CATEGORIES = List.of(
            new CategoryMeta("t-shirts", "T-Shirts", "live",
                    "High quality 240gsm combed cotton tees with signature relaxed unisex silhouettes.",
                    "/images/categories/t-shirts.jpg", 1),
            new CategoryMeta("combos", "Combos", "coming-soon",
                    "Curated duo-layer apparel packs and coordinated sets engineered for everyday comfort. Coming soon in upcoming drops.",
                    "/images/categories/combos.jpg", 2),
            new CategoryMeta("shirts", "Shirts", "coming-soon",
                    "Heritage structured cotton overshirts and relaxed button-downs.",
                    "/images/categories/shirts.jpg", 3),
            new CategoryMeta("hoodies", "Hoodies", "coming-soon",
                    "Dense loopback fleece boxy hoodies engineered for structure and longevity.",
                    "/images/categories/hoodies.jpg", 4),
            new CategoryMeta("pants", "Pants", "coming-soon",
                    "Articulated pleat cargos and everyday relaxed casual bottoms.",
                    "/images/categories/pants.jpg", 5),
            new CategoryMeta("sneakers", "Sneakers", "coming-soon",
                    "Handcrafted vulcanized low-tops with custom rubber outsoles.",
                    "/images/categories/sneakers.jpg", 6)
    );

    private record CategoryMeta(String slug, String name, String status, String description, String image, int sortOrder) {}

    /**
     * Lists active products for the storefront with optional category, stock, and search filters.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "public-products", key = "(#category != null ? #category : 'all') + '-' + #includeOutOfStock + '-' + (#search != null ? #search : 'none')")
    public List<PublicProductResponse> getAllPublicProducts(String category, boolean includeOutOfStock, String search) {
        log.debug("Fetching public products [category={}, includeOutOfStock={}, search={}]", category, includeOutOfStock, search);

        List<Item> activeItems = itemRepository.findActiveItemsWithSizes();

        return activeItems.stream()
                .map(this::toPublicProduct)
                .filter(p -> {
                    if (category != null && !category.isBlank() && !category.equalsIgnoreCase("all")) {
                        return p.category().equalsIgnoreCase(category.trim());
                    }
                    return true;
                })
                .filter(p -> includeOutOfStock || p.inStock())
                .filter(p -> {
                    if (search != null && !search.isBlank()) {
                        String q = search.trim().toLowerCase();
                        return p.name().toLowerCase().contains(q) ||
                                (p.desc() != null && p.desc().toLowerCase().contains(q)) ||
                                (p.type() != null && p.type().toLowerCase().contains(q));
                    }
                    return true;
                })
                .toList();
    }

    /**
     * Fetches single public product by ID.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "public-product-id", key = "#id")
    public Optional<PublicProductResponse> getPublicProductById(Long id) {
        log.debug("Fetching public product by ID [{}]", id);
        return itemRepository.findById(id)
                .filter(item -> item.getCurrentStatus() == ItemStatus.ACTIVE || item.getCurrentStatus() == ItemStatus.IN_STOCK)
                .map(this::toPublicProduct);
    }

    /**
     * Fetches single public product by slug.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "public-product-slug", key = "#slug")
    public Optional<PublicProductResponse> getPublicProductBySlug(String slug) {
        log.debug("Fetching public product by slug [{}]", slug);
        if (slug == null || slug.isBlank()) return Optional.empty();

        String targetSlug = slug.trim().toLowerCase();
        List<Item> activeItems = itemRepository.findActiveItemsWithSizes();

        return activeItems.stream()
                .filter(item -> toSlug(item.getItemName()).equalsIgnoreCase(targetSlug))
                .findFirst()
                .map(this::toPublicProduct);
    }

    /**
     * Fetches public categories with live product counts.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "public-categories")
    public List<PublicCategoryResponse> getPublicCategories() {
        log.debug("Fetching public storefront categories");

        List<Item> activeItems = itemRepository.findActiveItemsWithSizes();
        Map<String, Long> countByCategory = activeItems.stream()
                .map(item -> resolveCategory(item.getItemType()))
                .collect(Collectors.groupingBy(c -> c, Collectors.counting()));

        return CATEGORIES.stream()
                .map(cat -> new PublicCategoryResponse(
                        cat.slug(),
                        cat.name(),
                        cat.slug(),
                        cat.image(),
                        cat.status(),
                        cat.description(),
                        cat.sortOrder(),
                        countByCategory.getOrDefault(cat.slug(), 0L)
                ))
                .toList();
    }

    /**
     * Fetches approved customer reviews for an item.
     */
    @Transactional(readOnly = true)
    public List<PublicReviewResponse> getPublicReviewsForItem(Long itemId) {
        log.debug("Fetching public reviews for item [{}]", itemId);
        List<Review> reviews = reviewService.getReviewsForItem(itemId);

        return reviews.stream().map(r -> {
            String authorName = (r.getCustomer() != null && r.getCustomer().getCustomerName() != null)
                    ? anonymizeName(r.getCustomer().getCustomerName())
                    : "Verified Buyer";

            String size = (r.getSaleLineItem() != null) ? r.getSaleLineItem().getSize() : null;
            String date = (r.getSubmittedAt() != null)
                    ? DateTimeFormatter.ISO_INSTANT.format(r.getSubmittedAt())
                    : "";

            return new PublicReviewResponse(
                    r.getId() != null ? r.getId().toString() : UUID.randomUUID().toString(),
                    itemId,
                    authorName,
                    r.getStarRating() != null ? r.getStarRating() : 5,
                    date,
                    "Verified Purchase",
                    r.getComment() != null ? r.getComment() : "",
                    true,
                    size
            );
        }).toList();
    }

    /**
     * Cache invalidation hook invoked when items or inventory are modified.
     */
    @CacheEvict(value = {"public-products", "public-product-id", "public-product-slug", "public-categories"}, allEntries = true)
    public void evictAllProductCaches() {
        log.info("Evicted all storefront product and category caches");
    }

    // ── Helper Mappings ────────────────────────────────────────────────────────

    private PublicProductResponse toPublicProduct(Item item) {
        String slug = toSlug(item.getItemName());
        String category = resolveCategory(item.getItemType());

        // Map Sizes
        List<String> sizes = (item.getSizes() != null && !item.getSizes().isEmpty())
                ? item.getSizes().stream().map(ItemSize::getSize).distinct().toList()
                : List.of("XS", "S", "M", "L", "XL");

        // Map Inventory Availability per size (without revealing total counts)
        List<Inventory> inventoryRecords = inventoryRepository.findByItemId(item.getId());
        Map<String, Integer> stockBySizes = inventoryRecords.stream()
                .collect(Collectors.toMap(Inventory::getSize, Inventory::getTotalQuantity, (a, b) -> a));

        Map<String, Boolean> sizeStock = new LinkedHashMap<>();
        for (String size : sizes) {
            // In stock if quantity > 0, or if database has no inventory table entries yet, default true
            boolean isAvailable = inventoryRecords.isEmpty() || stockBySizes.getOrDefault(size, 0) > 0;
            sizeStock.put(size, isAvailable);
        }

        boolean inStock = sizeStock.values().stream().anyMatch(Boolean::booleanValue);

        // Images: use uploaded R2 images if present, otherwise use standard local fallback
        List<String> images = resolveImages(item, slug);
        String img = !images.isEmpty() ? images.get(0) : "/images/items/" + slug + "/image-1.jpg";
        String flatImg = images.size() > 1 ? images.get(1) : img;

        // Default or extracted colors
        List<String> colors = (item.getColors() != null && !item.getColors().isEmpty())
                ? item.getColors().stream().map(ItemColor::getColorHex).toList()
                : resolveColors(slug);

        // Tags
        List<String> tags = (item.getTags() != null && !item.getTags().isEmpty())
                ? item.getTags().stream().map(ItemTag::getTag).toList()
                : List.of();

        String description = (item.getDescription() != null && !item.getDescription().isBlank())
                ? item.getDescription().trim()
                : ((item.getItemName() != null)
                ? item.getItemName() + " — High quality 240gsm combed cotton with signature relaxed unisex silhouette. Engineered by Ficcado."
                : "Premium streetwear apparel by Ficcado.");

        return new PublicProductResponse(
                item.getId(),
                item.getItemName(),
                slug,
                item.getItemType() != null ? item.getItemType() : "T-Shirts",
                category,
                item.getPriceOfItem() != null ? item.getPriceOfItem() : BigDecimal.ZERO,
                item.getAverageRating() != null && item.getAverageRating().compareTo(BigDecimal.ZERO) > 0
                        ? item.getAverageRating()
                        : BigDecimal.valueOf(4.85),
                item.getReviewCount() != null ? item.getReviewCount() : 12,
                sizes,
                sizeStock,
                colors,
                description,
                description,
                img,
                flatImg,
                images,
                inStock,
                true,   // featured
                true,   // active
                item.getId() != null ? item.getId().intValue() : 1,
                tags
        );
    }

    private List<String> resolveImages(Item item, String slug) {
        if (item.getImages() != null && !item.getImages().isEmpty()) {
            return item.getImages().stream()
                    .sorted(Comparator.comparingInt(img -> img.getDisplayOrder() != null ? img.getDisplayOrder() : 99))
                    .map(ItemImage::getImageUrl)
                    .filter(Objects::nonNull)
                    .toList();
        }

        // Fallback standard storefront images
        return switch (slug) {
            case "chosen" -> List.of(
                    "/images/items/chosen/red-image-1.jpg",
                    "/images/items/chosen/red-image-2.jpg",
                    "/images/items/chosen/red-image-3.jpg",
                    "/images/items/chosen/red-image-4.jpg",
                    "/images/items/chosen/red-image-5.jpeg"
            );
            case "grounded" -> List.of(
                    "/images/items/grounded/black-image-1.jpg",
                    "/images/items/grounded/black-image-2.jpg",
                    "/images/items/grounded/black-image-3.jpg",
                    "/images/items/grounded/black-image-4.jpeg"
            );
            case "echoes-of-the-empire" -> List.of(
                    "/images/items/echoes-of-the-empire/navy-image-1.jpg",
                    "/images/items/echoes-of-the-empire/navy-image-2.jpg",
                    "/images/items/echoes-of-the-empire/navy-image-3.jpg",
                    "/images/items/echoes-of-the-empire/navy-image-4.jpeg"
            );
            case "no-gods-no-masters" -> List.of(
                    "/images/items/no-gods-no-masters/black-image-1.jpg",
                    "/images/items/no-gods-no-masters/black-image-2.jpg",
                    "/images/items/no-gods-no-masters/black-image-3.jpg",
                    "/images/items/no-gods-no-masters/black-image-4.jpeg"
            );
            case "silent-screams" -> List.of(
                    "/images/items/silent-screams/charcoal-image-1.jpg",
                    "/images/items/silent-screams/charcoal-image-2.jpg",
                    "/images/items/silent-screams/charcoal-image-3.jpg",
                    "/images/items/silent-screams/charcoal-image-4.jpeg"
            );
            default -> List.of(
                    "/images/items/" + slug + "/image-1.jpg",
                    "/images/items/" + slug + "/image-2.jpg"
            );
        };
    }

    private List<String> resolveColors(String slug) {
        return switch (slug) {
            case "chosen" -> List.of("#DC2626");
            case "grounded" -> List.of("#111827");
            case "echoes-of-the-empire" -> List.of("#1E293B");
            case "no-gods-no-masters" -> List.of("#000000");
            case "silent-screams" -> List.of("#374151");
            default -> List.of("#111827");
        };
    }

    public static String toSlug(String name) {
        if (name == null || name.isBlank()) return "product";
        return name.trim().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    public static String resolveCategory(String itemType) {
        if (itemType == null || itemType.isBlank()) return "t-shirts";
        String lower = itemType.trim().toLowerCase();
        if (lower.contains("t-shirt") || lower.contains("tshirt") || lower.contains("tee")) return "t-shirts";
        if (lower.contains("combo")) return "combos";
        if (lower.contains("hoodie") || lower.contains("sweat")) return "hoodies";
        if (lower.contains("shirt")) return "shirts";
        if (lower.contains("pant") || lower.contains("cargo") || lower.contains("bottom")) return "pants";
        if (lower.contains("sneaker") || lower.contains("shoe")) return "sneakers";
        return "t-shirts";
    }

    private static String anonymizeName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "Verified Customer";
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length == 1) return parts[0];
        return parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
    }
}
