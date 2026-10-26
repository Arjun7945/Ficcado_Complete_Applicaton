
package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.ItemColor;
import com.aps.ficcado_crm_backend.entity.ItemSize;
import com.aps.ficcado_crm_backend.entity.ItemTag;
import com.aps.ficcado_crm_backend.entity.enums.ItemStatus;
import com.aps.ficcado_crm_backend.exception.ItemVersionConflictException;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ItemService {

    private final ItemRepository itemRepository;
    private final ActivityLogService activityLogService;

    @Transactional(readOnly = true)
    public List<Item> getAll() {
        return itemRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Item> getActiveItemsWithSizes() {
        return itemRepository.findActiveItemsWithSizes();
    }

    @Transactional(readOnly = true)
    public Optional<Item> getById(Long id) {
        return itemRepository.findById(id);
    }

    @Transactional
    @CacheEvict(value = {"public-products", "public-product-id", "public-product-slug", "public-categories"}, allEntries = true)
    public Item createItem(String itemName, String itemType, BigDecimal priceOfItem,
                           BigDecimal costPrice, List<String> sizes, ItemStatus currentStatus,
                           String description, List<String> colors, List<String> tags, Admin admin) {
        String validDesc = validateDescription(description);
        List<String> validColors = validateColors(colors);
        List<String> validTags = validateTags(tags);

        Item item = Item.builder()
                .itemName(itemName)
                .itemType(itemType)
                .priceOfItem(priceOfItem)
                .costPrice(costPrice)
                .currentStatus(currentStatus != null ? currentStatus : ItemStatus.ACTIVE)
                .description(validDesc)
                .createdByAdmin(admin)
                .updatedByAdmin(admin)
                .build();

        if (sizes != null) {
            sizes.stream()
                    .filter(size -> size != null && !size.isBlank())
                    .map(String::trim)
                    .distinct()
                    .map(size -> ItemSize.builder().item(item).size(size).build())
                    .forEach(item.getSizes()::add);
        }

        for (int i = 0; i < validColors.size(); i++) {
            item.getColors().add(ItemColor.builder()
                    .item(item)
                    .colorHex(validColors.get(i))
                    .displayOrder(i)
                    .build());
        }

        for (String tag : validTags) {
            item.getTags().add(ItemTag.builder()
                    .item(item)
                    .tag(tag)
                    .build());
        }

        Item saved = itemRepository.save(item);
        String entityId = saved.getId() != null ? saved.getId().toString() : "";
        activityLogService.log(admin, "CREATE", "ITEMS", "items",
                entityId, "Item created: " + saved.getItemName());
        log.info("Item created [id={}, name={}, type={}, status={}]", saved.getId(), saved.getItemName(), saved.getItemType(), saved.getCurrentStatus());
        return saved;
    }

    @Transactional
    public Item createItem(String itemName, String itemType, BigDecimal priceOfItem,
                           BigDecimal costPrice, List<String> sizes, ItemStatus currentStatus, Admin admin) {
        return createItem(itemName, itemType, priceOfItem, costPrice, sizes, currentStatus, null, null, null, admin);
    }

    @Transactional
    public Item createItem(String itemName, String itemType, BigDecimal priceOfItem,
                           BigDecimal costPrice, List<String> sizes, Admin admin) {
        return createItem(itemName, itemType, priceOfItem, costPrice, sizes, ItemStatus.ACTIVE, null, null, null, admin);
    }

    @Transactional
    @CacheEvict(value = {"public-products", "public-product-id", "public-product-slug", "public-categories"}, allEntries = true)
    public Optional<Item> updateItem(Long id, String itemName, String itemType,
                                     BigDecimal priceOfItem, BigDecimal costPrice,
                                     List<String> sizes, ItemStatus currentStatus,
                                     String description, List<String> colors, List<String> tags,
                                     Long version, Admin admin) {
        return itemRepository.findById(id).map(item -> {
            // Optimistic locking check (AUD-09)
            if (version != null && !version.equals(item.getVersion())) {
                throw new ItemVersionConflictException(version, item.getVersion());
            }

            item.setItemName(itemName);
            item.setItemType(itemType);
            item.setPriceOfItem(priceOfItem);
            item.setCostPrice(costPrice);
            if (currentStatus != null) {
                item.setCurrentStatus(currentStatus);
            }
            item.setUpdatedByAdmin(admin);

            if (description != null) {
                item.setDescription(validateDescription(description));
            }

            if (colors != null) {
                List<String> validColors = validateColors(colors);
                item.getColors().clear();
                for (int i = 0; i < validColors.size(); i++) {
                    item.getColors().add(ItemColor.builder()
                            .item(item)
                            .colorHex(validColors.get(i))
                            .displayOrder(i)
                            .build());
                }
            }

            if (tags != null) {
                List<String> validTags = validateTags(tags);
                item.getTags().clear();
                for (String tag : validTags) {
                    item.getTags().add(ItemTag.builder()
                            .item(item)
                            .tag(tag)
                            .build());
                }
            }

            if (sizes != null) {
                Set<String> newSizes = sizes.stream()
                        .filter(size -> size != null && !size.isBlank())
                        .map(String::trim)
                        .collect(Collectors.toCollection(LinkedHashSet::new));

                // Remove sizes no longer present in the updated set
                item.getSizes().removeIf(existing -> !newSizes.contains(existing.getSize()));

                // Determine sizes already present on the entity
                Set<String> existingSizes = item.getSizes().stream()
                        .map(ItemSize::getSize)
                        .collect(Collectors.toSet());

                // Add only newly requested sizes
                newSizes.stream()
                        .filter(size -> !existingSizes.contains(size))
                        .map(size -> ItemSize.builder().item(item).size(size).build())
                        .forEach(item.getSizes()::add);
            }

            Item saved = itemRepository.save(item);
            activityLogService.log(admin, "UPDATE", "ITEMS", "items",
                    saved.getId().toString(), "Item updated: " + saved.getItemName());
            log.info("Item updated [id={}, name={}, version={}]", saved.getId(), saved.getItemName(), saved.getVersion());
            return saved;
        });
    }

    @Transactional
    public Optional<Item> updateItem(Long id, String itemName, String itemType,
                                     BigDecimal priceOfItem, BigDecimal costPrice,
                                     List<String> sizes, ItemStatus currentStatus, Admin admin) {
        return updateItem(id, itemName, itemType, priceOfItem, costPrice, sizes, currentStatus, null, null, null, null, admin);
    }

    @Transactional
    public Optional<Item> updateItem(Long id, String itemName, String itemType,
                                     BigDecimal priceOfItem, BigDecimal costPrice,
                                     List<String> sizes, Admin admin) {
        return updateItem(id, itemName, itemType, priceOfItem, costPrice, sizes, null, null, null, null, null, admin);
    }

    @Transactional
    @CacheEvict(value = {"public-products", "public-product-id", "public-product-slug", "public-categories"}, allEntries = true)
    public Optional<Item> toggleStatus(Long id, ItemStatus newStatus, Admin admin) {
        return itemRepository.findById(id).map(item -> {
            item.setCurrentStatus(newStatus);
            item.setUpdatedByAdmin(admin);
            Item saved = itemRepository.save(item);
            activityLogService.log(admin, "STATUS_CHANGE", "ITEMS", "items",
                    saved.getId().toString(),
                    "Item " + saved.getItemName() + " set to " + newStatus.name());
            return saved;
        });
    }

    @Transactional
    @CacheEvict(value = {"public-products", "public-product-id", "public-product-slug", "public-categories"}, allEntries = true)
    public boolean deleteItem(Long id, Admin admin) {
        Item item = itemRepository.findById(id).orElse(null);
        if (item == null) {
            return false;
        }

        if (itemRepository.hasLinkedRecords(id)) {
            log.info("Item [id={}] has linked records — setting to INACTIVE instead of deleting", id);
            item.setCurrentStatus(ItemStatus.INACTIVE);
            item.setUpdatedByAdmin(admin);
            itemRepository.save(item);
            activityLogService.log(admin, "SOFT_DELETE", "ITEMS", "items",
                    id.toString(), "Item set to INACTIVE due to linked records ID: " + id);
            return true;
        }

        itemRepository.delete(item);
        activityLogService.log(admin, "DELETE", "ITEMS", "items",
                id.toString(), "Item deleted ID: " + id);
        log.info("Item deleted [id={}]", id);
        return true;
    }

    // ── Validation Helpers (B-1, B-4) ─────────────────────────────────────────

    private static final Pattern HEX_COLOR_PATTERN = Pattern.compile("^#[0-9A-Fa-f]{6}$");

    public static List<String> validateColors(List<String> rawColors) {
        if (rawColors == null || rawColors.isEmpty()) {
            return List.of();
        }
        if (rawColors.size() > 12) {
            throw new IllegalArgumentException("Maximum 12 colors allowed per item. Provided: " + rawColors.size());
        }
        Set<String> seen = new HashSet<>();
        List<String> validated = new ArrayList<>();
        for (String c : rawColors) {
            if (c == null || c.isBlank()) {
                continue;
            }
            String trimmed = c.trim().toUpperCase();
            if (!HEX_COLOR_PATTERN.matcher(trimmed).matches()) {
                throw new IllegalArgumentException("Invalid color hex format. Expected #RRGGBB (e.g. #FF0000): " + c);
            }
            if (!seen.add(trimmed)) {
                throw new IllegalArgumentException("Duplicate color hex not allowed: " + trimmed);
            }
            validated.add(trimmed);
        }
        return validated;
    }

    public static List<String> validateTags(List<String> rawTags) {
        if (rawTags == null || rawTags.isEmpty()) {
            return List.of();
        }
        if (rawTags.size() > 10) {
            throw new IllegalArgumentException("Maximum 10 tags allowed per item. Provided: " + rawTags.size());
        }
        Set<String> lowerSeen = new HashSet<>();
        List<String> validated = new ArrayList<>();
        for (String t : rawTags) {
            if (t == null || t.isBlank()) {
                continue;
            }
            String trimmed = t.trim();
            if (trimmed.length() < 2 || trimmed.length() > 30) {
                throw new IllegalArgumentException("Tag length must be between 2 and 30 characters: '" + trimmed + "'");
            }
            if (!lowerSeen.add(trimmed.toLowerCase())) {
                throw new IllegalArgumentException("Duplicate tag not allowed (case-insensitive): " + trimmed);
            }
            validated.add(trimmed);
        }
        return validated;
    }

    public static String validateDescription(String rawDescription) {
        if (rawDescription == null || rawDescription.isBlank()) {
            return null;
        }
        String trimmed = rawDescription.trim();
        if (trimmed.length() > 2000) {
            throw new IllegalArgumentException("Description cannot exceed 2000 characters. Current length: " + trimmed.length());
        }
        return trimmed;
    }
}

