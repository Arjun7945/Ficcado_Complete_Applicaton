package com.aps.ficcado_inventory_sales_management_app.service;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.DamagedProduct;
import com.aps.ficcado_inventory_sales_management_app.entity.Item;
import com.aps.ficcado_inventory_sales_management_app.entity.Sale;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.DamagedProductSource;
import com.aps.ficcado_inventory_sales_management_app.repository.DamagedProductRepository;
import com.aps.ficcado_inventory_sales_management_app.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DamagedProductService {

    private final DamagedProductRepository damagedProductRepository;
    private final ItemRepository itemRepository;

    /**
     * Automatically record a damaged product entry when a replacement or return/refund
     * disposition is SENT_TO_DAMAGED_PRODUCTS.
     */
    @Transactional
    public DamagedProduct recordFromDisposition(Sale sale, Long itemId, String itemName,
                                                String size, int quantity,
                                                String reasonNotes, DamagedProductSource source,
                                                Admin performedByAdmin) {
        Item item = itemId != null ? itemRepository.findById(itemId).orElse(null) : null;

        DamagedProduct entry = DamagedProduct.builder()
                .sale(sale)
                .invoiceNumber(sale != null ? sale.getInvoiceNumber() : null)
                .item(item)
                .itemName(itemName)
                .size(size)
                .quantity(quantity)
                .customerName(sale != null ? sale.getCustomerName() : null)
                .reasonNotes(reasonNotes)
                .source(source)
                .createdByAdmin(performedByAdmin)
                .updatedByAdmin(performedByAdmin)
                .build();

        return damagedProductRepository.save(entry);
    }

    @Transactional
    public DamagedProduct createManual(Long itemId, String itemName, String size,
                                       int quantity, String reasonNotes, Admin performedByAdmin) {
        Item item = itemId != null ? itemRepository.findById(itemId).orElse(null) : null;

        DamagedProduct entry = DamagedProduct.builder()
                .item(item)
                .itemName(itemName != null ? itemName : (item != null ? item.getItemName() : ""))
                .size(size)
                .quantity(quantity)
                .reasonNotes(reasonNotes)
                .source(DamagedProductSource.MANUAL)
                .createdByAdmin(performedByAdmin)
                .updatedByAdmin(performedByAdmin)
                .build();

        return damagedProductRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public List<DamagedProduct> getAll() {
        return damagedProductRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<DamagedProduct> findById(Long id) {
        return damagedProductRepository.findById(id);
    }

    @Transactional
    public Optional<DamagedProduct> update(Long id, Long itemId, String itemName, String size,
                                           int quantity, String reasonNotes, Admin performedByAdmin) {
        return damagedProductRepository.findById(id).map(entry -> {
            if (itemId != null) {
                entry.setItem(itemRepository.findById(itemId).orElse(entry.getItem()));
            }
            if (itemName != null && !itemName.isBlank()) {
                entry.setItemName(itemName.trim());
            }
            if (size != null && !size.isBlank()) {
                entry.setSize(size.trim());
            }
            if (quantity > 0) {
                entry.setQuantity(quantity);
            }
            if (reasonNotes != null) {
                entry.setReasonNotes(reasonNotes.trim());
            }
            entry.setUpdatedByAdmin(performedByAdmin);
            return damagedProductRepository.save(entry);
        });
    }

    @Transactional
    public void delete(Long id) {
        damagedProductRepository.deleteById(id);
    }
}
