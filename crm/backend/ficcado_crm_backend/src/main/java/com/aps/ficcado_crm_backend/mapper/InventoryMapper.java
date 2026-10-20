package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.InventoryDto.InventoryResponse;
import com.aps.ficcado_crm_backend.entity.Inventory;

public final class InventoryMapper {

    private InventoryMapper() {}

    public static InventoryResponse toResponse(Inventory inv) {
        if (inv == null) return null;
        return new InventoryResponse(
                inv.getId(),
                inv.getItem() != null ? inv.getItem().getId() : null,
                inv.getItem() != null ? inv.getItem().getItemName() : null,
                inv.getSize(),
                inv.getTotalQuantity(),
                inv.getCurrentStatus()
        );
    }
}
