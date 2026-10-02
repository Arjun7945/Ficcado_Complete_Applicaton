package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.dto.ReplacementDto;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.Replacement;
import com.aps.ficcado_crm_backend.entity.ReplacementNewItem;
import com.aps.ficcado_crm_backend.entity.ReplacementOldItem;
import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.entity.enums.DamagedProductSource;
import com.aps.ficcado_crm_backend.entity.enums.DispositionOfItems;
import com.aps.ficcado_crm_backend.entity.enums.FulfilmentSource;
import com.aps.ficcado_crm_backend.entity.enums.InventoryTransactionType;
import com.aps.ficcado_crm_backend.entity.enums.ReplacementStatus;
import com.aps.ficcado_crm_backend.entity.enums.SaleStatus;
import com.aps.ficcado_crm_backend.exception.BusinessRuleException;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.repository.ReplacementRepository;
import com.aps.ficcado_crm_backend.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Manages the full replacement workflow.
 * Migrated from app/api/replacement/ route handlers.
 *
 * Multi-step status progression:
 * APPROVED → DISPATCHED → RECEIVED → SATISFIED_AND_COMPLETED
 *
 * On complete:
 * - Old items: RETURNED_TO_INVENTORY (restock) or SENT_TO_DAMAGED_PRODUCTS
 * - New items: deducted from inventory (or warehouse handler)
 * - Sales record: unlocked (status → PURCHASE_SATISFIED_AND_ORDER_COMPLETED)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReplacementService {

    private final ReplacementRepository replacementRepository;
    private final ItemRepository itemRepository;
    private final InventoryService inventoryService;
    private final DamagedProductService damagedProductService;
    private final SaleService saleService;
    private final ActivityLogService activityLogService;
    private final SalesLogService salesLogService;
    private final SaleRepository saleRepository;

    @Transactional
    public Replacement create(Replacement replacement, Admin performedByAdmin) {
        log.info("Creating replacement for invoice [{}] by admin [id={}]",
                replacement.getInvoiceNumber(),
                performedByAdmin != null ? performedByAdmin.getId() : "system");
        replacement.setInvoiceStatus(ReplacementStatus.APPROVED);
        Replacement saved = replacementRepository.save(replacement);

        activityLogService.log(performedByAdmin, "CREATE", "REPLACEMENT", "replacement",
                saved.getInvoiceNumber(), "Replacement created for " + saved.getInvoiceNumber());

        return saved;
    }

    @Transactional
    public Replacement updateReplacement(Long id, Replacement updatedData, Admin performedByAdmin) {
        log.info("Updating replacement [id={}] by admin [id={}]", id,
                performedByAdmin != null ? performedByAdmin.getId() : "system");
        Replacement rep = findByIdOrThrow(id);

        if (updatedData.getDispositionOfOldItems() != null) {
            rep.setDispositionOfOldItems(updatedData.getDispositionOfOldItems());
        }
        if (updatedData.getRestockDestination() != null) {
            rep.setRestockDestination(updatedData.getRestockDestination().trim());
        }
        if (updatedData.getNewStockSource() != null) {
            rep.setNewStockSource(updatedData.getNewStockSource());
        }
        if (updatedData.getNewDeliveryCharge() != null) {
            rep.setNewDeliveryCharge(updatedData.getNewDeliveryCharge());
        }
        if (updatedData.getNewDiscount() != null) {
            rep.setNewDiscount(updatedData.getNewDiscount());
        }
        if (updatedData.getNewTotalAmount() != null) {
            rep.setNewTotalAmount(updatedData.getNewTotalAmount());
        }
        if (updatedData.getInvoiceStatus() != null) {
            rep.setInvoiceStatus(updatedData.getInvoiceStatus());
        }

        if (updatedData.getOldItems() != null && !updatedData.getOldItems().isEmpty()) {
            rep.getOldItems().clear();
            updatedData.getOldItems().forEach(oi -> {
                oi.setReplacement(rep);
                if (oi.getItem() == null && oi.getItemName() != null && !oi.getItemName().isBlank()) {
                    itemRepository.findByItemNameIgnoreCase(oi.getItemName().trim()).ifPresent(oi::setItem);
                }
                rep.getOldItems().add(oi);
            });
        }

        if (updatedData.getNewItems() != null && !updatedData.getNewItems().isEmpty()) {
            rep.getNewItems().clear();
            updatedData.getNewItems().forEach(ni -> {
                ni.setReplacement(rep);
                if (ni.getItem() == null && ni.getItemName() != null && !ni.getItemName().isBlank()) {
                    itemRepository.findByItemNameIgnoreCase(ni.getItemName().trim()).ifPresent(ni::setItem);
                }
                rep.getNewItems().add(ni);
            });
        }

        rep.setUpdatedByAdmin(performedByAdmin);
        Replacement saved = replacementRepository.save(rep);

        activityLogService.log(performedByAdmin, "UPDATE", "REPLACEMENT", "replacement",
                saved.getInvoiceNumber(), "Replacement updated for " + saved.getInvoiceNumber());

        return saved;
    }

    @Transactional
    public Replacement saveProgress(Long id, ReplacementStatus newStatus, Admin performedByAdmin) {
        Replacement replacement = findByIdOrThrow(id);
        replacement.setInvoiceStatus(newStatus);
        Replacement saved = replacementRepository.save(replacement);

        activityLogService.log(performedByAdmin, "UPDATE", "REPLACEMENT", "replacement",
                saved.getInvoiceNumber(),
                "Replacement " + saved.getInvoiceNumber() + " status → " + newStatus.name());

        return saved;
    }

    /**
     * Complete the replacement:
     * 1. Deduct new items from stock (inventory or warehouse)
     * 2. Handle old item disposition (restock or damaged products)
     * 3. Set replacement status → SATISFIED_AND_COMPLETED
     * 4. Unlock the sale
     */
    @Transactional
    public Replacement complete(Long id, Admin performedByAdmin) {
        log.info("Completing replacement [id={}] by admin [id={}]", id,
                performedByAdmin != null ? performedByAdmin.getId() : "system");
        Replacement replacement = replacementRepository.findByIdWithItems(id)
                .orElseThrow(() -> new IllegalArgumentException("Replacement not found: " + id));

        // 1. Deduct new items from stock
        replacement.getNewItems().forEach(newItem -> {
            if (newItem.getItem() == null && newItem.getItemName() != null && !newItem.getItemName().isBlank()) {
                itemRepository.findByItemNameIgnoreCase(newItem.getItemName().trim()).ifPresent(newItem::setItem);
            }
            Long resolvedItemId = newItem.getItem() != null ? newItem.getItem().getId() : null;

            switch (replacement.getNewStockSource()) {
                case TAKE_FROM_INVENTORY -> inventoryService.deductFromInventory(
                        resolvedItemId,
                        newItem.getSize(), newItem.getQuantity(),
                        replacement.getInvoiceNumber(),
                        InventoryTransactionType.REPLACEMENT.name(), performedByAdmin);
                case WAREHOUSE_HANDLER -> {
                    if (replacement.getCreatedByAdmin() != null) {
                        inventoryService.deductFromWarehouse(
                                replacement.getCreatedByAdmin().getId(),
                                resolvedItemId,
                                newItem.getSize(), newItem.getQuantity(),
                                replacement.getInvoiceNumber(),
                                InventoryTransactionType.REPLACEMENT.name(), performedByAdmin);
                    }
                }
                case null, default -> {}
            }
        });

        // 2. Handle old item disposition
        replacement.getOldItems().forEach(oldItem -> {
            if (oldItem.getItem() == null && oldItem.getItemName() != null && !oldItem.getItemName().isBlank()) {
                itemRepository.findByItemNameIgnoreCase(oldItem.getItemName().trim()).ifPresent(oldItem::setItem);
            }
            Long resolvedItemId = oldItem.getItem() != null ? oldItem.getItem().getId() : null;

            switch (replacement.getDispositionOfOldItems()) {
                case RETURNED_TO_INVENTORY -> inventoryService.restockInventory(
                        resolvedItemId,
                        oldItem.getSize(), oldItem.getQuantity(),
                        replacement.getInvoiceNumber(),
                        InventoryTransactionType.REPLACEMENT,
                        replacement.getRestockDestination(), performedByAdmin);
                case SENT_TO_DAMAGED_PRODUCTS -> damagedProductService.recordFromDisposition(
                        replacement.getSale(),
                        resolvedItemId,
                        oldItem.getItemName(), oldItem.getSize(), oldItem.getQuantity(),
                        "From replacement of " + replacement.getInvoiceNumber(),
                        DamagedProductSource.REPLACEMENT, performedByAdmin);
                case null, default -> {}
            }
        });

        // 3. Mark completed
        replacement.setInvoiceStatus(ReplacementStatus.SATISFIED_AND_COMPLETED);
        Replacement saved = replacementRepository.save(replacement);

        // 4. Unlock sale
        saleService.unlockSale(replacement.getSale().getId(), performedByAdmin);

        // 5. Logs
        String dispositionLabel = replacement.getDispositionOfOldItems() != null
                ? replacement.getDispositionOfOldItems().name().replace("_", " ").toLowerCase()
                : "unspecified";

        activityLogService.log(performedByAdmin, "COMPLETE", "REPLACEMENT", "replacement",
                saved.getInvoiceNumber(), "Replacement " + saved.getInvoiceNumber() + " completed.");

        salesLogService.log(performedByAdmin, "Replacement", "COMPLETE", saved.getInvoiceNumber(),
                salesLogService.replacementCompletedMessage(
                        saved.getInvoiceNumber(), performedByAdmin.getAdminName(), dispositionLabel));

        return saved;
    }

    @Transactional
    public List<Replacement> getAll() {
        // Auto-heal: Ensure any sales under REPLACE_REQUESTED have an active replacement ticket
        List<Sale> lockedSales = saleRepository.findAll().stream()
                .filter(s -> s.getSaleStatus() == SaleStatus.REPLACE_REQUESTED
                        || "Replace-Requested".equalsIgnoreCase(s.getFulfilmentRequestStatus()))
                .toList();
        for (Sale sale : lockedSales) {
            if (replacementRepository.findByInvoiceNumber(sale.getInvoiceNumber()).isEmpty()) {
                Replacement rep = Replacement.builder()
                        .sale(sale)
                        .invoiceNumber(sale.getInvoiceNumber())
                        .invoiceStatus(ReplacementStatus.APPROVED)
                        .build();
                replacementRepository.save(rep);
                log.info("Auto-initialized replacement ticket for invoice [{}] in getAll", sale.getInvoiceNumber());
            }
        }
        return replacementRepository.findAllWithItems();
    }

    @Transactional(readOnly = true)
    public Optional<Replacement> findById(Long id) {
        return replacementRepository.findByIdWithItems(id);
    }

    @Transactional
    public Optional<Replacement> findByInvoiceNumber(String invoiceNumber) {
        Optional<Replacement> existing = replacementRepository.findByInvoiceNumberWithItems(invoiceNumber);
        if (existing.isPresent()) {
            return existing;
        }
        return saleRepository.findByInvoiceNumber(invoiceNumber)
                .filter(sale -> sale.getSaleStatus() == SaleStatus.REPLACE_REQUESTED
                        || "Replace-Requested".equalsIgnoreCase(sale.getFulfilmentRequestStatus()))
                .map(sale -> {
                    Replacement rep = Replacement.builder()
                            .sale(sale)
                            .invoiceNumber(sale.getInvoiceNumber())
                            .invoiceStatus(ReplacementStatus.APPROVED)
                            .build();
                    Replacement saved = replacementRepository.save(rep);
                    log.info("Auto-initialized missing replacement record for invoice [{}]", invoiceNumber);
                    return saved;
                });
    }

    @Transactional
    public Replacement updateReplacement(Long id, ReplacementDto.ReplacementUpdateRequest request, Admin performedByAdmin) {
        log.info("Updating replacement [id={}] by admin [id={}]", id,
                performedByAdmin != null ? performedByAdmin.getId() : "system");
        Replacement rep = findByIdOrThrow(id);

        if (request.status() != null && !request.status().isBlank()) {
            rep.setInvoiceStatus(ReplacementStatus.fromString(request.status()));
        }
        if (request.dispositionOfOldItems() != null && !request.dispositionOfOldItems().isBlank()) {
            rep.setDispositionOfOldItems(DispositionOfItems.fromString(request.dispositionOfOldItems()));
        }
        if (request.restockDestination() != null) {
            rep.setRestockDestination(request.restockDestination().trim());
        }
        if (request.newStockSource() != null && !request.newStockSource().isBlank()) {
            rep.setNewStockSource(FulfilmentSource.fromString(request.newStockSource()));
        }
        if (request.newDeliveryCharge() != null) {
            rep.setNewDeliveryCharge(request.newDeliveryCharge());
        }
        if (request.newDiscount() != null) {
            rep.setNewDiscount(request.newDiscount());
        }
        if (request.newTotalAmount() != null) {
            rep.setNewTotalAmount(request.newTotalAmount());
        }

        if (request.oldItems() != null) {
            rep.getOldItems().clear();
            request.oldItems().forEach(oi -> {
                ReplacementOldItem item = ReplacementOldItem.builder()
                        .replacement(rep)
                        .itemName(oi.itemName())
                        .size(oi.size())
                        .quantity(oi.quantity())
                        .build();
                if (oi.itemId() != null) {
                    itemRepository.findById(oi.itemId()).ifPresent(item::setItem);
                } else if (oi.itemName() != null && !oi.itemName().isBlank()) {
                    itemRepository.findByItemNameIgnoreCase(oi.itemName().trim()).ifPresent(item::setItem);
                }
                rep.getOldItems().add(item);
            });
        }

        if (request.newItems() != null) {
            rep.getNewItems().clear();
            request.newItems().forEach(ni -> {
                ReplacementNewItem item = ReplacementNewItem.builder()
                        .replacement(rep)
                        .itemName(ni.itemName())
                        .size(ni.size())
                        .quantity(ni.quantity())
                        .priceEach(ni.priceEach() != null ? ni.priceEach() : BigDecimal.ZERO)
                        .totalPrice(ni.totalPrice() != null ? ni.totalPrice() : BigDecimal.ZERO)
                        .build();
                if (ni.itemId() != null) {
                    itemRepository.findById(ni.itemId()).ifPresent(item::setItem);
                } else if (ni.itemName() != null && !ni.itemName().isBlank()) {
                    itemRepository.findByItemNameIgnoreCase(ni.itemName().trim()).ifPresent(item::setItem);
                }
                rep.getNewItems().add(item);
            });
        }

        rep.setUpdatedByAdmin(performedByAdmin);
        Replacement saved = replacementRepository.save(rep);

        activityLogService.log(performedByAdmin, "UPDATE", "REPLACEMENT", "replacement",
                saved.getInvoiceNumber(), "Replacement updated for " + saved.getInvoiceNumber());

        return saved;
    }

    private Replacement findByIdOrThrow(Long id) {
        return replacementRepository.findByIdWithItems(id)
                .or(() -> replacementRepository.findById(id))
                .orElseThrow(() -> new IllegalArgumentException("Replacement not found: " + id));
    }
}
