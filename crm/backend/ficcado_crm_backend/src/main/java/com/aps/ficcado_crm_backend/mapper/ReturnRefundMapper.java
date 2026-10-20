package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.ReturnRefundDto;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.ReturnRefund;
import com.aps.ficcado_crm_backend.entity.ReturnRefundItem;
import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.entity.enums.DispositionOfItems;
import com.aps.ficcado_crm_backend.entity.enums.ItemVerificationStatus;
import com.aps.ficcado_crm_backend.entity.enums.RefundStatus;
import com.aps.ficcado_crm_backend.repository.ItemRepository;

import java.math.BigDecimal;
import java.util.List;

/**
 * Manual mapper for the ReturnRefund module.
 */
public final class ReturnRefundMapper {

    private ReturnRefundMapper() {}

    public static ReturnRefundDto.ReturnedItemResponse toItemResponse(ReturnRefundItem item) {
        return new ReturnRefundDto.ReturnedItemResponse(
                item.getId(),
                item.getItem() != null ? item.getItem().getId() : null,
                item.getItemName(),
                item.getSize(),
                item.getQuantity(),
                item.getPriceEach(),
                item.getTotalPrice()
        );
    }

    public static ReturnRefundDto.ReturnRefundResponse toResponse(ReturnRefund rr) {
        List<ReturnRefundDto.ReturnedItemResponse> items = rr.getReturnedItems() != null
                ? rr.getReturnedItems().stream().map(ReturnRefundMapper::toItemResponse).toList()
                : List.of();

        return new ReturnRefundDto.ReturnRefundResponse(
                rr.getId(),
                rr.getSale() != null ? rr.getSale().getId() : null,
                rr.getInvoiceNumber(),
                rr.getItemVerificationStatus() != null ? rr.getItemVerificationStatus().name() : null,
                rr.getRefundStatus().name(),
                rr.getRefundAmount(),
                rr.getRefundCompletedDateTime(),
                rr.getTransactionId(),
                rr.getModeOfRefund(),
                rr.getDispositionOfReturnedItems() != null ? rr.getDispositionOfReturnedItems().name() : null,
                rr.getRestockDestination(),
                rr.getPriceChargedReturnedItems(),
                rr.getNewDiscountApplied(),
                rr.getReasonForReturn(),
                rr.getClosedByAdmin() != null ? rr.getClosedByAdmin().getId() : null,
                rr.getClosedByAdmin() != null ? rr.getClosedByAdmin().getAdminName() : null,
                rr.getVersion() != null ? rr.getVersion() : 1,
                rr.getCreatedAt(),
                rr.getUpdatedAt(),
                items
        );
    }

    public static ReturnRefund toEntity(ReturnRefundDto.ReturnRefundRequest r, Sale sale, Admin admin, ItemRepository itemRepository) {
        ReturnRefund rr = ReturnRefund.builder()
                .sale(sale)
                .invoiceNumber(r.invoiceNumber() != null ? r.invoiceNumber() : sale.getInvoiceNumber())
                .reasonForReturn(r.reasonForReturn())
                .createdByAdmin(admin)
                .updatedByAdmin(admin)
                .build();

        if (r.returnedItems() != null) {
            r.returnedItems().stream()
                    .map(li -> ReturnRefundItem.builder()
                            .returnRefund(rr)
                            .item(resolveItem(li.itemId(), li.itemName(), itemRepository))
                            .itemName(li.itemName())
                            .size(li.size())
                            .quantity(li.quantity())
                            .priceEach(li.priceEach() != null ? li.priceEach() : BigDecimal.ZERO)
                            .totalPrice(li.totalPrice() != null ? li.totalPrice() : BigDecimal.ZERO)
                            .build())
                    .forEach(rr.getReturnedItems()::add);
        }
        return rr;
    }

    public static void applyUpdatePatch(ReturnRefund patch, ReturnRefundDto.ReturnRefundUpdateRequest request) {
        if (request.itemVerificationStatus() != null) {
            patch.setItemVerificationStatus(ItemVerificationStatus.fromString(request.itemVerificationStatus()));
        }
        if (request.refundStatus() != null) {
            patch.setRefundStatus(RefundStatus.fromString(request.refundStatus()));
        }
        if (request.refundAmount() != null) {
            patch.setRefundAmount(request.refundAmount());
        }
        if (request.transactionId() != null) {
            patch.setTransactionId(request.transactionId());
        }
        if (request.modeOfRefund() != null) {
            patch.setModeOfRefund(request.modeOfRefund());
        }
        if (request.dispositionOfReturnedItems() != null) {
            patch.setDispositionOfReturnedItems(
                    DispositionOfItems.fromString(request.dispositionOfReturnedItems()));
        }
        if (request.restockDestination() != null) {
            patch.setRestockDestination(request.restockDestination());
        }
        if (request.priceChargedReturnedItems() != null) {
            patch.setPriceChargedReturnedItems(request.priceChargedReturnedItems());
        }
        if (request.newDiscountApplied() != null) {
            patch.setNewDiscountApplied(request.newDiscountApplied());
        }
        if (request.reasonForReturn() != null) {
            patch.setReasonForReturn(request.reasonForReturn());
        }
        if (request.refundCompletedDateTime() != null) {
            patch.setRefundCompletedDateTime(request.refundCompletedDateTime());
        }
        if (Boolean.TRUE.equals(request.markRefundCompleted())) {
            patch.setRefundStatus(RefundStatus.COMPLETED);
        }
    }

    private static Item resolveItem(Long itemId, String itemName, ItemRepository itemRepository) {
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
