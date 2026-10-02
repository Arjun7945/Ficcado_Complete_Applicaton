package com.aps.ficcado_crm_backend.dto;

import java.time.Instant;

/**
 * Data Transfer Objects for the Logs module.
 */
public class LogsDto {

    public record ActivityLogResponse(
            Long id,
            Long adminId,
            String adminName,
            String action,
            String module,
            String moduleKey,
            String recordId,
            String message,
            Instant loggedAt
    ) {}

    public record SalesLogResponse(
            Long id,
            String module,
            String operation,
            String relatedInvoiceNumber,
            String logMessage,
            Long adminId,
            String adminName,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record InventoryHistoryResponse(
            Long id,
            Long itemId,
            String itemName,
            String size,
            int quantityChange,
            String affectedLocation,
            Long handlerAdminId,
            String handlerAdminName,
            String transactionType,
            String relatedInvoiceNumber,
            Integer resultingBalance,
            String resultingBalanceNote,
            String notes,
            Long adminId,
            String adminName,
            Instant loggedAt
    ) {}
}
