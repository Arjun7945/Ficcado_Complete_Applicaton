package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.LogsDto.ActivityLogResponse;
import com.aps.ficcado_crm_backend.dto.LogsDto.InventoryHistoryResponse;
import com.aps.ficcado_crm_backend.dto.LogsDto.SalesLogResponse;
import com.aps.ficcado_crm_backend.entity.ActivityLog;
import com.aps.ficcado_crm_backend.entity.InventoryHistory;
import com.aps.ficcado_crm_backend.entity.SalesLog;

public final class LogsMapper {

    private LogsMapper() {}

    public static ActivityLogResponse toActivityLogResponse(ActivityLog l) {
        if (l == null) return null;
        return new ActivityLogResponse(
                l.getId(),
                l.getAdmin() != null ? l.getAdmin().getId() : null,
                l.getAdminName(),
                l.getAction(),
                l.getModule(),
                l.getModuleKey(),
                l.getRecordId(),
                l.getMessage(),
                l.getLoggedAt()
        );
    }

    public static SalesLogResponse toSalesLogResponse(SalesLog l) {
        if (l == null) return null;
        return new SalesLogResponse(
                l.getId(),
                l.getModule(),
                l.getOperation(),
                l.getRelatedInvoiceNumber(),
                l.getLogMessage(),
                l.getAdmin() != null ? l.getAdmin().getId() : null,
                l.getAdminName(),
                l.getCreatedAt(),
                l.getUpdatedAt()
        );
    }

    public static InventoryHistoryResponse toInventoryHistoryResponse(InventoryHistory h) {
        if (h == null) return null;
        return new InventoryHistoryResponse(
                h.getId(),
                h.getItem() != null ? h.getItem().getId() : null,
                h.getItemName(),
                h.getSize(),
                h.getQuantityChange(),
                h.getAffectedLocation(),
                h.getHandlerAdmin() != null ? h.getHandlerAdmin().getId() : null,
                h.getHandlerAdmin() != null ? h.getHandlerAdmin().getAdminName() : null,
                h.getTransactionType() != null ? h.getTransactionType().name() : null,
                h.getRelatedInvoiceNumber(),
                h.getResultingBalance(),
                h.getResultingBalanceNote(),
                h.getNotes(),
                h.getAdmin() != null ? h.getAdmin().getId() : null,
                h.getAdminName(),
                h.getLoggedAt()
        );
    }
}
