package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.ActivityLog;
import com.aps.ficcado_inventory_sales_management_app.entity.SalesLog;
import com.aps.ficcado_inventory_sales_management_app.entity.InventoryHistory;
import com.aps.ficcado_inventory_sales_management_app.repository.InventoryHistoryRepository;
import com.aps.ficcado_inventory_sales_management_app.service.ActivityLogService;
import com.aps.ficcado_inventory_sales_management_app.service.SalesLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/logs")
@Tag(name = "Audit Logs")
@RequiredArgsConstructor
public class LogsController {

    private final ActivityLogService activityLogService;
    private final SalesLogService salesLogService;
    private final InventoryHistoryRepository inventoryHistoryRepository;

    // ── Activity Logs ─────────────────────────────────────────────────────────

    @GetMapping("/activity")
    @Operation(summary = "Recent activity log (last 100 entries)")
    public List<ActivityLogResponse> getActivityLogs() {
        return activityLogService.getRecent().stream().map(ActivityLogResponse::from).toList();
    }

    @GetMapping("/activity/all")
    @Operation(summary = "All activity log entries")
    public List<ActivityLogResponse> getAllActivity() {
        return activityLogService.getAll().stream().map(ActivityLogResponse::from).toList();
    }

    // ── Sales Logs ────────────────────────────────────────────────────────────

    @GetMapping("/sales")
    @Operation(summary = "Recent sales narrative log (last 100 entries)")
    public List<SalesLogResponse> getSalesLogs() {
        return salesLogService.getRecent().stream().map(SalesLogResponse::from).toList();
    }

    @GetMapping("/sales/all")
    @Operation(summary = "All sales log entries")
    public List<SalesLogResponse> getAllSalesLogs() {
        return salesLogService.getAll().stream().map(SalesLogResponse::from).toList();
    }

    @GetMapping("/sales/by-invoice/{invoiceNumber}")
    @Operation(summary = "Sales log entries for a specific invoice number")
    public List<SalesLogResponse> getSalesLogByInvoice(@PathVariable String invoiceNumber) {
        return salesLogService.getByInvoice(invoiceNumber)
                .stream().map(SalesLogResponse::from).toList();
    }

    // ── Inventory History ─────────────────────────────────────────────────────

    @GetMapping("/inventory-history")
    @Operation(summary = "Recent inventory history (last 200 entries)")
    public List<InventoryHistoryResponse> getInventoryHistory() {
        return inventoryHistoryRepository.findTop200ByOrderByLoggedAtDesc()
                .stream().map(InventoryHistoryResponse::from).toList();
    }

    @GetMapping("/inventory-history/by-item/{itemId}")
    @Operation(summary = "Inventory history for a specific item")
    public List<InventoryHistoryResponse> getInventoryHistoryByItem(@PathVariable Long itemId) {
        return inventoryHistoryRepository.findByItemIdOrderByLoggedAtDesc(itemId)
                .stream().map(InventoryHistoryResponse::from).toList();
    }

    @GetMapping("/inventory-history/by-invoice/{invoiceNumber}")
    @Operation(summary = "Inventory history related to a specific invoice")
    public List<InventoryHistoryResponse> getInventoryHistoryByInvoice(@PathVariable String invoiceNumber) {
        return inventoryHistoryRepository.findByRelatedInvoiceNumberOrderByLoggedAtDesc(invoiceNumber)
                .stream().map(InventoryHistoryResponse::from).toList();
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    record ActivityLogResponse(Long id, Long adminId, String adminName,
                                String action, String module, String moduleKey,
                                String recordId, String message, Instant loggedAt) {
        static ActivityLogResponse from(ActivityLog l) {
            return new ActivityLogResponse(
                    l.getId(),
                    l.getAdmin() != null ? l.getAdmin().getId() : null,
                    l.getAdminName(), l.getAction(), l.getModule(),
                    l.getModuleKey(), l.getRecordId(), l.getMessage(), l.getLoggedAt());
        }
    }

    record SalesLogResponse(Long id, String module, String operation,
                             String relatedInvoiceNumber, String logMessage,
                             Long adminId, String adminName,
                             Instant createdAt, Instant updatedAt) {
        static SalesLogResponse from(SalesLog l) {
            return new SalesLogResponse(
                    l.getId(), l.getModule(), l.getOperation(),
                    l.getRelatedInvoiceNumber(), l.getLogMessage(),
                    l.getAdmin() != null ? l.getAdmin().getId() : null,
                    l.getAdminName(), l.getCreatedAt(), l.getUpdatedAt());
        }
    }

    record InventoryHistoryResponse(Long id, Long itemId, String itemName, String size,
                                     int quantityChange, String affectedLocation,
                                     Long handlerAdminId, String handlerAdminName,
                                     String transactionType, String relatedInvoiceNumber,
                                     Integer resultingBalance, String resultingBalanceNote,
                                     String notes, Long adminId, String adminName,
                                     Instant loggedAt) {
        static InventoryHistoryResponse from(InventoryHistory h) {
            return new InventoryHistoryResponse(
                    h.getId(),
                    h.getItem() != null ? h.getItem().getId() : null,
                    h.getItemName(), h.getSize(), h.getQuantityChange(),
                    h.getAffectedLocation(),
                    h.getHandlerAdmin() != null ? h.getHandlerAdmin().getId() : null,
                    h.getHandlerAdmin() != null ? h.getHandlerAdmin().getAdminName() : null,
                    h.getTransactionType() != null ? h.getTransactionType().name() : null,
                    h.getRelatedInvoiceNumber(), h.getResultingBalance(),
                    h.getResultingBalanceNote(), h.getNotes(),
                    h.getAdmin() != null ? h.getAdmin().getId() : null,
                    h.getAdminName(), h.getLoggedAt());
        }
    }
}
