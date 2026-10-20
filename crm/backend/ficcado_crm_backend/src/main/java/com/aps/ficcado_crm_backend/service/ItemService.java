package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.ItemSize;
import com.aps.ficcado_crm_backend.entity.enums.ItemStatus;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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
    public Item createItem(String itemName, String itemType, BigDecimal priceOfItem,
                           BigDecimal costPrice, List<String> sizes, ItemStatus currentStatus, Admin admin) {
        Item item = Item.builder()
                .itemName(itemName)
                .itemType(itemType)
                .priceOfItem(priceOfItem)
                .costPrice(costPrice)
                .currentStatus(currentStatus != null ? currentStatus : ItemStatus.ACTIVE)
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

        Item saved = itemRepository.save(item);
        String entityId = saved.getId() != null ? saved.getId().toString() : "";
        activityLogService.log(admin, "CREATE", "ITEMS", "items",
                entityId, "Item created: " + saved.getItemName());
        log.info("Item created [id={}, name={}, type={}, status={}]", saved.getId(), saved.getItemName(), saved.getItemType(), saved.getCurrentStatus());
        return saved;
    }

    @Transactional
    public Item createItem(String itemName, String itemType, BigDecimal priceOfItem,
                           BigDecimal costPrice, List<String> sizes, Admin admin) {
        return createItem(itemName, itemType, priceOfItem, costPrice, sizes, ItemStatus.ACTIVE, admin);
    }

    @Transactional
    public Optional<Item> updateItem(Long id, String itemName, String itemType,
                                     BigDecimal priceOfItem, BigDecimal costPrice,
                                     List<String> sizes, ItemStatus currentStatus, Admin admin) {
        return itemRepository.findById(id).map(item -> {
            item.setItemName(itemName);
            item.setItemType(itemType);
            item.setPriceOfItem(priceOfItem);
            item.setCostPrice(costPrice);
            if (currentStatus != null) {
                item.setCurrentStatus(currentStatus);
            }
            item.setUpdatedByAdmin(admin);

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
            log.info("Item updated [id={}, name={}]", saved.getId(), saved.getItemName());
            return saved;
        });
    }

    @Transactional
    public Optional<Item> updateItem(Long id, String itemName, String itemType,
                                     BigDecimal priceOfItem, BigDecimal costPrice,
                                     List<String> sizes, Admin admin) {
        return updateItem(id, itemName, itemType, priceOfItem, costPrice, sizes, null, admin);
    }

    @Transactional
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
}

