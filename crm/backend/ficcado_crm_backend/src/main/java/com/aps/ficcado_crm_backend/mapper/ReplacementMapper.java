package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.ReplacementDto;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.Replacement;
import com.aps.ficcado_crm_backend.entity.ReplacementNewItem;
import com.aps.ficcado_crm_backend.entity.ReplacementOldItem;
import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.entity.enums.DispositionOfItems;
import com.aps.ficcado_crm_backend.entity.enums.FulfilmentSource;
import com.aps.ficcado_crm_backend.repository.ItemRepository;

import java.math.BigDecimal;
import java.util.List;

/**
 * Manual mapper for the Replacement module.
 */
public final class ReplacementMapper {

    private ReplacementMapper() {}

    public static ReplacementDto.OldItemResponse toOldItemResponse(ReplacementOldItem oi) {
        return new ReplacementDto.OldItemResponse(
                oi.getId(),
                oi.getItem() != null ? oi.getItem().getId() : null,
                oi.getItemName(),
                oi.getSize(),
                oi.getQuantity()
        );
    }

    public static ReplacementDto.NewItemResponse toNewItemResponse(ReplacementNewItem ni) {
        return new ReplacementDto.NewItemResponse(
                ni.getId(),
                ni.getItem() != null ? ni.getItem().getId() : null,
                ni.getItemName(),
                ni.getSize(),
                ni.getQuantity(),
                ni.getPriceEach(),
                ni.getTotalPrice()
        );
    }

    public static ReplacementDto.ReplacementResponse toResponse(Replacement r) {
        List<ReplacementDto.OldItemResponse> oldItems = r.getOldItems().stream()
                .map(ReplacementMapper::toOldItemResponse)
                .toList();

        List<ReplacementDto.NewItemResponse> newItems = r.getNewItems().stream()
                .map(ReplacementMapper::toNewItemResponse)
                .toList();

        return new ReplacementDto.ReplacementResponse(
                r.getId(),
                r.getSale() != null ? r.getSale().getId() : null,
                r.getInvoiceNumber(),
                r.getInvoiceStatus() != null ? r.getInvoiceStatus().name() : null,
                r.getDispositionOfOldItems() != null ? r.getDispositionOfOldItems().name() : null,
                r.getRestockDestination(),
                r.getNewStockSource() != null ? r.getNewStockSource().name() : null,
                r.getNewDeliveryCharge(),
                r.getNewDiscount(),
                r.getNewTotalAmount(),
                r.getVersion() != null ? r.getVersion() : 1,
                r.getCreatedAt(),
                r.getUpdatedAt(),
                oldItems,
                newItems
        );
    }

    public static Replacement toEntity(ReplacementDto.ReplacementRequest r,
                                      Sale sale,
                                      Admin admin,
                                      ItemRepository itemRepository) {
        Replacement rep = Replacement.builder()
                .sale(sale)
                .invoiceNumber(r.invoiceNumber() != null ? r.invoiceNumber() : (sale != null ? sale.getInvoiceNumber() : null))
                .dispositionOfOldItems(r.dispositionOfOldItems() != null ? DispositionOfItems.fromString(r.dispositionOfOldItems()) : null)
                .restockDestination(r.restockDestination())
                .newStockSource(r.newStockSource() != null ? FulfilmentSource.fromString(r.newStockSource()) : null)
                .newDeliveryCharge(r.newDeliveryCharge() != null ? r.newDeliveryCharge() : BigDecimal.ZERO)
                .newDiscount(r.newDiscount() != null ? r.newDiscount() : BigDecimal.ZERO)
                .newTotalAmount(r.newTotalAmount() != null ? r.newTotalAmount() : BigDecimal.ZERO)
                .createdByAdmin(admin)
                .updatedByAdmin(admin)
                .build();

        if (r.oldItems() != null) {
            r.oldItems().stream()
                    .map(li -> ReplacementOldItem.builder()
                            .replacement(rep)
                            .item(resolveItem(li.itemId(), li.itemName(), itemRepository))
                            .itemName(li.itemName())
                            .size(li.size())
                            .quantity(li.quantity())
                            .build())
                    .forEach(rep.getOldItems()::add);
        }
        if (r.newItems() != null) {
            r.newItems().stream()
                    .map(li -> ReplacementNewItem.builder()
                            .replacement(rep)
                            .item(resolveItem(li.itemId(), li.itemName(), itemRepository))
                            .itemName(li.itemName())
                            .size(li.size())
                            .quantity(li.quantity())
                            .priceEach(li.priceEach() != null ? li.priceEach() : BigDecimal.ZERO)
                            .totalPrice(li.totalPrice() != null ? li.totalPrice() : BigDecimal.ZERO)
                            .build())
                    .forEach(rep.getNewItems()::add);
        }
        return rep;
    }

    public static Replacement toEntity(ReplacementDto.ReplacementUpdateRequest r,
                                      Sale sale,
                                      Admin admin,
                                      ItemRepository itemRepository) {
        Replacement rep = Replacement.builder()
                .sale(sale)
                .invoiceNumber(sale != null ? sale.getInvoiceNumber() : null)
                .invoiceStatus(r.status() != null ? com.aps.ficcado_crm_backend.entity.enums.ReplacementStatus.fromString(r.status()) : com.aps.ficcado_crm_backend.entity.enums.ReplacementStatus.APPROVED)
                .dispositionOfOldItems(r.dispositionOfOldItems() != null ? DispositionOfItems.fromString(r.dispositionOfOldItems()) : null)
                .restockDestination(r.restockDestination())
                .newStockSource(r.newStockSource() != null ? FulfilmentSource.fromString(r.newStockSource()) : null)
                .newDeliveryCharge(r.newDeliveryCharge() != null ? r.newDeliveryCharge() : BigDecimal.ZERO)
                .newDiscount(r.newDiscount() != null ? r.newDiscount() : BigDecimal.ZERO)
                .newTotalAmount(r.newTotalAmount() != null ? r.newTotalAmount() : BigDecimal.ZERO)
                .createdByAdmin(admin)
                .updatedByAdmin(admin)
                .build();

        if (r.oldItems() != null) {
            r.oldItems().stream()
                    .map(li -> ReplacementOldItem.builder()
                            .replacement(rep)
                            .item(resolveItem(li.itemId(), li.itemName(), itemRepository))
                            .itemName(li.itemName())
                            .size(li.size())
                            .quantity(li.quantity())
                            .build())
                    .forEach(rep.getOldItems()::add);
        }
        if (r.newItems() != null) {
            r.newItems().stream()
                    .map(li -> ReplacementNewItem.builder()
                            .replacement(rep)
                            .item(resolveItem(li.itemId(), li.itemName(), itemRepository))
                            .itemName(li.itemName())
                            .size(li.size())
                            .quantity(li.quantity())
                            .priceEach(li.priceEach() != null ? li.priceEach() : BigDecimal.ZERO)
                            .totalPrice(li.totalPrice() != null ? li.totalPrice() : BigDecimal.ZERO)
                            .build())
                    .forEach(rep.getNewItems()::add);
        }
        return rep;
    }

    private static Item resolveItem(
            Long itemId,
            String itemName,
            ItemRepository itemRepository) {
        if (itemRepository == null) return null;
        if (itemId != null) {
            Item item = itemRepository.findById(itemId).orElse(null);
            if (item != null) return item;
        }
        if (itemName != null && !itemName.isBlank()) {
            return itemRepository.findByItemNameIgnoreCase(itemName.trim()).orElse(null);
        }
        return null;
    }
}

