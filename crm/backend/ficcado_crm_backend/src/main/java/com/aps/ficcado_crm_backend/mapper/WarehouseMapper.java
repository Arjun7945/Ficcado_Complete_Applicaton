package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.WarehouseDto.WarehouseResponse;
import com.aps.ficcado_crm_backend.entity.WarehouseAllocation;

public final class WarehouseMapper {

    private WarehouseMapper() {}

    public static WarehouseResponse toResponse(WarehouseAllocation wa) {
        if (wa == null) return null;
        return new WarehouseResponse(
                wa.getId(),
                wa.getWarehouseLocation(),
                wa.getHandlerAdmin() != null ? wa.getHandlerAdmin().getId() : null,
                wa.getHandlerAdmin() != null ? wa.getHandlerAdmin().getAdminName() : null,
                wa.getItem() != null ? wa.getItem().getId() : null,
                wa.getItem() != null ? wa.getItem().getItemName() : null,
                wa.getSize(),
                wa.getQuantity()
        );
    }
}
