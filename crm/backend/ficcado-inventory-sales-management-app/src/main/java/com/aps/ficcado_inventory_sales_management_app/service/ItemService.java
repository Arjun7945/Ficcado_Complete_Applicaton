package com.aps.ficcado_inventory_sales_management_app.service;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.Item;
import com.aps.ficcado_inventory_sales_management_app.entity.ItemSize;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.ItemStatus;
import com.aps.ficcado_inventory_sales_management_app.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

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
        return itemRepository.findActiveItemsWithSizes(ItemStatus.ACTIVE);
    }

    @Transactional(readOnly = true)
    public Optional<Item> getById(Long id) {
        return itemRepository.findById(id);
    }

    @Transactional
    public Item createItem(String itemName, String itemType, BigDecimal priceOfItem,
                           BigDecimal costPrice, List<String> sizes, Admin admin) {
        Item item = Item.builder()
                .itemName(itemName)
                .itemType(itemType)
                .priceOfItem(priceOfItem)
                .costPrice(costPrice)
                .currentStatus(ItemStatus.ACTIVE)
                .createdByAdmin(admin)
                .updatedByAdmin(admin)
                .build();

        if (sizes != null) {
            for (String size : sizes) {
                item.getSizes().add(ItemSize.builder().item(item).size(size).build());
            }
        }

        Item saved = itemRepository.save(item);
        activityLogService.log(admin, "CREATE", "ITEMS", "items",
                saved.getId().toString(), "Item created: " + saved.getItemName());
        return saved;
    }

    @Transactional
    public Optional<Item> updateItem(Long id, String itemName, String itemType,
                                     BigDecimal priceOfItem, BigDecimal costPrice,
                                     List<String> sizes, Admin admin) {
        return itemRepository.findById(id).map(item -> {
            item.setItemName(itemName);
            item.setItemType(itemType);
            item.setPriceOfItem(priceOfItem);
            item.setCostPrice(costPrice);
            item.setUpdatedByAdmin(admin);

            if (sizes != null) {
                item.getSizes().clear();
                for (String size : sizes) {
                    item.getSizes().add(ItemSize.builder().item(item).size(size).build());
                }
            }

            Item saved = itemRepository.save(item);
            activityLogService.log(admin, "UPDATE", "ITEMS", "items",
                    saved.getId().toString(), "Item updated: " + saved.getItemName());
            return saved;
        });
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
        if (!itemRepository.existsById(id)) {
            return false;
        }
        try {
            itemRepository.deleteById(id);
            activityLogService.log(admin, "DELETE", "ITEMS", "items",
                    id.toString(), "Item deleted ID: " + id);
        } catch (DataIntegrityViolationException ex) {
            Item item = itemRepository.findById(id).orElseThrow();
            item.setCurrentStatus(ItemStatus.INACTIVE);
            item.setUpdatedByAdmin(admin);
            itemRepository.save(item);
            activityLogService.log(admin, "SOFT_DELETE", "ITEMS", "items",
                    id.toString(), "Item set to INACTIVE due to linked records ID: " + id);
        }
        return true;
    }
}
