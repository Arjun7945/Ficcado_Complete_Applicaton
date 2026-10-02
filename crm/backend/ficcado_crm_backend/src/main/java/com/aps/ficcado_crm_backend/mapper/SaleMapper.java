package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.SaleDto;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.entity.SaleLineItem;
import com.aps.ficcado_crm_backend.entity.enums.DeliveryStatus;
import com.aps.ficcado_crm_backend.entity.enums.FulfilmentSource;
import com.aps.ficcado_crm_backend.entity.enums.PaymentStatus;
import com.aps.ficcado_crm_backend.entity.enums.SaleStatus;
import com.aps.ficcado_crm_backend.repository.AdminRepository;
import com.aps.ficcado_crm_backend.repository.ItemRepository;

import java.math.BigDecimal;
import java.util.List;

/**
 * Manual mapper for the Sale module.
 * Centralises all Sale ↔ DTO projection logic,
 * including entity transformations for requests and responses.
 */
public final class SaleMapper {

    private SaleMapper() {}

    public static SaleDto.LineItemResponse toLineItemResponse(SaleLineItem li) {
        return new SaleDto.LineItemResponse(
                li.getId(),
                li.getItem() != null ? li.getItem().getId() : null,
                li.getItemName(),
                li.getSize(),
                li.getQuantity(),
                li.getPriceEach(),
                li.getTotalPrice()
        );
    }

    public static SaleDto.SaleResponse toResponse(Sale s) {
        String fStatus = s.getFulfilmentRequestStatus() != null && !s.getFulfilmentRequestStatus().isBlank()
                ? s.getFulfilmentRequestStatus()
                : "Normal";
        boolean locked = false;
        switch (s.getSaleStatus()) {
            case REPLACE_REQUESTED -> {
                fStatus = "Replace-Requested";
                locked = true;
            }
            case REFUND_REQUESTED -> {
                fStatus = "Refund-Requested";
                locked = true;
            }
            case null, default -> {
                if ("Replace-Requested".equalsIgnoreCase(fStatus) || "Refund-Requested".equalsIgnoreCase(fStatus)) {
                    locked = true;
                }
            }
        }

        List<SaleDto.LineItemResponse> lineItems = s.getLineItems() != null
                ? s.getLineItems().stream().map(SaleMapper::toLineItemResponse).toList()
                : List.of();

        return new SaleDto.SaleResponse(
                s.getId(),
                s.getInvoiceNumber(),
                s.getCustomer() != null ? s.getCustomer().getId() : null,
                s.getCustomerName(),
                s.getCustomerPhoneNumber(),
                s.getCustomerAddress(),
                s.getCustomerEmail(),
                s.getSaleStatus().name(),
                s.getPaymentStatus().name(),
                s.getModeOfPayment(),
                s.getTransactionId(),
                s.getDeliveryStatus().name(),
                Boolean.TRUE.equals(s.getDeliveryChargeEnabled()),
                s.getDeliveryChargeAmount(),
                s.getFulfilmentSource() != null ? s.getFulfilmentSource().name() : null,
                s.getFulfilmentRequestStatus() != null ? s.getFulfilmentRequestStatus() : fStatus,
                fStatus,
                locked,
                s.getDiscount(),
                s.getTotalAmount(),
                s.getSaleClosedByAdmin() != null ? s.getSaleClosedByAdmin().getId() : null,
                s.getSaleClosedByAdmin() != null ? s.getSaleClosedByAdmin().getAdminName() : null,
                s.getReceivedBy(),
                s.getRemarks(),
                s.getVersion() != null ? s.getVersion() : 1,
                s.getCreatedAt(),
                s.getUpdatedAt(),
                lineItems
        );
    }

    public static Sale toEntity(SaleDto.SaleRequest r, Admin admin,
                                ItemRepository itemRepository, AdminRepository adminRepository) {
        String modeOfPayment = r.modeOfPayment() != null && !r.modeOfPayment().isBlank() && !"N/A".equalsIgnoreCase(r.modeOfPayment().trim())
                ? r.modeOfPayment().trim()
                : "Not_Selected_Yet";

        String transactionId = r.transactionId() != null && !r.transactionId().isBlank() && !"N/A".equalsIgnoreCase(r.transactionId().trim())
                ? r.transactionId().trim()
                : "No_transaction_id_Collected_Yet";

        String customerAddress = r.customerAddress() != null && !r.customerAddress().isBlank() && !"N/A".equalsIgnoreCase(r.customerAddress().trim())
                ? r.customerAddress().trim()
                : "Address_Not_Provided_Yet";

        String customerEmail = r.customerEmail() != null && !r.customerEmail().isBlank() && !"N/A".equalsIgnoreCase(r.customerEmail().trim())
                ? r.customerEmail().trim()
                : "No_Email_Provided";

        String receivedBy = r.receivedBy() != null && !r.receivedBy().isBlank() && !"N/A".equalsIgnoreCase(r.receivedBy().trim())
                ? r.receivedBy().trim()
                : "Not_Received_Yet";

        String remarks = r.remarks() != null && !r.remarks().isBlank() && !"N/A".equalsIgnoreCase(r.remarks().trim())
                ? r.remarks().trim()
                : "No_Remarks";

        String fRequestStatus = r.fulfilmentRequestStatus() != null && !r.fulfilmentRequestStatus().isBlank()
                ? r.fulfilmentRequestStatus().trim()
                : (r.fulfilmentStatus() != null && !r.fulfilmentStatus().isBlank() ? r.fulfilmentStatus().trim() : "Normal");

        Sale sale = Sale.builder()
                .invoiceNumber(r.invoiceNumber())
                .customerName(r.customerName() != null && !r.customerName().isBlank() ? r.customerName().trim() : "Walk-in Customer")
                .customerPhoneNumber(r.customerPhoneNumber())
                .customerAddress(customerAddress)
                .customerEmail(customerEmail)
                .saleStatus(r.saleStatus() != null ? SaleStatus.fromString(r.saleStatus()) : SaleStatus.COMPLETED)
                .paymentStatus(r.paymentStatus() != null ? PaymentStatus.fromString(r.paymentStatus()) : PaymentStatus.PAID)
                .modeOfPayment(modeOfPayment)
                .transactionId(transactionId)
                .deliveryStatus(r.deliveryStatus() != null ? DeliveryStatus.fromString(r.deliveryStatus()) : DeliveryStatus.DELIVERED)
                .deliveryChargeEnabled(Boolean.TRUE.equals(r.deliveryChargeEnabled()))
                .deliveryChargeAmount(r.deliveryChargeAmount() != null ? r.deliveryChargeAmount() : BigDecimal.ZERO)
                .fulfilmentRequestStatus(fRequestStatus)
                .fulfilmentSource(r.fulfilmentSource() != null ? FulfilmentSource.fromString(r.fulfilmentSource()) : FulfilmentSource.TAKE_FROM_INVENTORY)
                .discount(r.discount() != null ? r.discount() : BigDecimal.ZERO)
                .totalAmount(r.totalAmount() != null ? r.totalAmount() : BigDecimal.ZERO)
                .receivedBy(receivedBy)
                .remarks(remarks)
                .createdByAdmin(admin)
                .updatedByAdmin(admin)
                .build();

        if (r.saleClosedByAdminId() != null) {
            adminRepository.findById(r.saleClosedByAdminId()).ifPresent(sale::setSaleClosedByAdmin);
        } else if (sale.getSaleStatus() == SaleStatus.PURCHASE_SATISFIED_AND_ORDER_COMPLETED
                || sale.getSaleStatus() == SaleStatus.COMPLETED) {
            sale.setSaleClosedByAdmin(admin);
        }

        if (r.lineItems() != null) {
            r.lineItems().stream()
                    .map(li -> toLineItemEntity(li, sale, itemRepository))
                    .forEach(sale.getLineItems()::add);
        }

        return sale;
    }

    public static SaleLineItem toLineItemEntity(SaleDto.LineItemRequest li, Sale sale, ItemRepository itemRepository) {
        Item item = null;
        if (li.itemId() != null) {
            item = itemRepository.findById(li.itemId()).orElse(null);
        }
        if (item == null && li.itemName() != null && !li.itemName().isBlank()) {
            item = itemRepository.findByItemNameIgnoreCase(li.itemName().trim()).orElse(null);
        }
        return SaleLineItem.builder()
                .sale(sale)
                .item(item)
                .itemName(item != null ? item.getItemName() : li.itemName())
                .size(li.size())
                .quantity(li.quantity())
                .priceEach(li.priceEach() != null ? li.priceEach() : BigDecimal.ZERO)
                .totalPrice(li.totalPrice() != null ? li.totalPrice() : BigDecimal.ZERO)
                .build();
    }
}
