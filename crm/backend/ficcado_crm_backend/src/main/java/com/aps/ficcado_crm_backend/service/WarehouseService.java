package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.dto.WarehouseDto.WarehouseRequest;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.WarehouseAllocation;
import com.aps.ficcado_crm_backend.repository.AdminRepository;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.repository.WarehouseAllocationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Manages warehouse allocations and handler stock balances.
 * Enforces unallocated inventory cap limits and writes audit activity logs.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WarehouseService {

    private final WarehouseAllocationRepository warehouseRepo;
    private final ItemRepository itemRepository;
    private final AdminRepository adminRepository;
    private final InventoryService inventoryService;
    private final ActivityLogService activityLogService;

    @Transactional(readOnly = true)
    public List<WarehouseAllocation> getAll() {
        log.debug("Fetching all warehouse allocations with details");
        return warehouseRepo.findAllWithDetails();
    }

    @Transactional(readOnly = true)
    public List<WarehouseAllocation> findByHandlerAdminId(Long adminId) {
        log.debug("Fetching warehouse allocations for handler admin [id={}]", adminId);
        return warehouseRepo.findByHandlerAdminId(adminId);
    }

    @Transactional
    public WarehouseAllocation createAllocation(WarehouseRequest request, Admin admin) {
        log.info("Creating warehouse allocation at location: {}, size: {}, qty: {}",
                request.warehouseLocation(), request.size(), request.quantity());

        Item item = null;
        if (request.itemId() != null) {
            item = itemRepository.findById(request.itemId()).orElse(null);
        }
        if (item == null && request.itemName() != null && !request.itemName().isBlank()) {
            item = itemRepository.findByItemNameIgnoreCase(request.itemName().trim()).orElse(null);
        }
        if (item == null) {
            throw new IllegalArgumentException("Item not found: id=" + request.itemId() + ", name=" + request.itemName());
        }

        // Enforce cap: can't allocate more than unallocated inventory
        int unallocated = inventoryService.getUnallocatedQuantity(item.getId(), request.size());
        if (request.quantity() > unallocated) {
            throw new IllegalStateException(
                    "Cannot allocate %d piece(s). Only %d piece(s) remain unallocated for this item/size."
                            .formatted(request.quantity(), unallocated));
        }

        Admin handler = null;
        if (request.handlerAdminId() != null) {
            handler = adminRepository.findById(request.handlerAdminId()).orElse(null);
        }
        if (handler == null && request.handlerName() != null && !request.handlerName().isBlank()) {
            handler = adminRepository.findByAdminNameIgnoreCase(request.handlerName().trim()).orElse(null);
        }

        WarehouseAllocation wa = WarehouseAllocation.builder()
                .warehouseLocation(request.warehouseLocation())
                .item(item)
                .size(request.size())
                .quantity(request.quantity())
                .handlerAdmin(handler)
                .createdByAdmin(admin)
                .updatedByAdmin(admin)
                .build();

        WarehouseAllocation saved = warehouseRepo.save(wa);
        activityLogService.log(admin, "CREATE", "WAREHOUSE", "warehouse",
                saved.getId().toString(),
                "Warehouse allocation created: " + item.getItemName() + " size " + request.size()
                        + " qty " + request.quantity() + " at " + request.warehouseLocation());

        log.info("Warehouse allocation created successfully [id={}, location={}, qty={}]",
                saved.getId(), saved.getWarehouseLocation(), saved.getQuantity());
        return saved;
    }

    @Transactional
    public List<WarehouseAllocation> createBatch(List<WarehouseRequest> requests, Admin admin) {
        log.info("Batch creating {} warehouse allocations", requests.size());
        return requests.stream()
                .map(req -> createAllocation(req, admin))
                .toList();
    }

    @Transactional
    public Optional<WarehouseAllocation> updateQuantity(Long id, int newQty, Admin admin) {
        log.info("Updating warehouse allocation [id={}] quantity to {}", id, newQty);
        return warehouseRepo.findById(id).map(wa -> {
            int unallocated = inventoryService.getUnallocatedQuantity(
                    wa.getItem().getId(), wa.getSize());
            if (newQty > (unallocated + wa.getQuantity())) {
                throw new IllegalStateException(
                        "New quantity exceeds available unallocated stock.");
            }

            wa.setQuantity(newQty);
            wa.setUpdatedByAdmin(admin);
            WarehouseAllocation saved = warehouseRepo.save(wa);
            activityLogService.log(admin, "UPDATE", "WAREHOUSE", "warehouse",
                    id.toString(), "Warehouse allocation updated: qty → " + newQty);
            log.info("Warehouse allocation [id={}] updated successfully", id);
            return saved;
        });
    }

    @Transactional
    public boolean deleteAllocation(Long id, Admin admin) {
        log.info("Deleting warehouse allocation [id={}]", id);
        return warehouseRepo.findById(id).map(wa -> {
            activityLogService.log(admin, "DELETE", "WAREHOUSE", "warehouse",
                    id.toString(), "Warehouse allocation deleted");
            warehouseRepo.deleteById(id);
            log.info("Warehouse allocation [id={}] deleted successfully", id);
            return true;
        }).orElse(false);
    }

    @Transactional
    public void deleteByLocationAndHandler(String location, String handler, Admin admin) {
        log.info("Deleting warehouse allocations by location: {} and handler: {}", location, handler);
        List<WarehouseAllocation> list = warehouseRepo.findAllWithDetails().stream()
                .filter(w -> w.getWarehouseLocation().equalsIgnoreCase(location.trim()))
                .filter(w -> {
                    if (handler == null || handler.isBlank()) return true;
                    String hName = w.getHandlerAdmin() != null ? w.getHandlerAdmin().getAdminName() : w.getWarehouseLocation();
                    return hName.equalsIgnoreCase(handler.trim());
                })
                .toList();

        list.forEach(wa -> {
            activityLogService.log(admin, "DELETE", "WAREHOUSE", "warehouse",
                    wa.getId().toString(), "Warehouse allocation deleted for " + location + " / " + handler);
            warehouseRepo.delete(wa);
        });
        log.info("Deleted {} warehouse allocations for location {} / handler {}", list.size(), location, handler);
    }
}
