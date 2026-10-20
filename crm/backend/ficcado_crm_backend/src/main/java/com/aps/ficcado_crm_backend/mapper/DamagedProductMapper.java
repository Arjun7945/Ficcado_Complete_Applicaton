package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.DamagedProductDto.DamagedResponse;
import com.aps.ficcado_crm_backend.entity.DamagedProduct;

public final class DamagedProductMapper {

    private DamagedProductMapper() {}

    public static DamagedResponse toResponse(DamagedProduct d) {
        if (d == null) return null;
        return new DamagedResponse(
                d.getId(),
                d.getInvoiceNumber(),
                d.getSale() != null ? d.getSale().getId() : null,
                d.getItem() != null ? d.getItem().getId() : null,
                d.getItemName(),
                d.getSize(),
                d.getQuantity(),
                d.getCustomerName(),
                d.getReasonNotes(),
                d.getSource() != null ? d.getSource().name() : null,
                d.getCreatedAt()
        );
    }
}
