package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.LogsDto.ActivityLogResponse;
import com.aps.ficcado_crm_backend.dto.LogsDto.InventoryHistoryResponse;
import com.aps.ficcado_crm_backend.dto.LogsDto.SalesLogResponse;
import com.aps.ficcado_crm_backend.mapper.LogsMapper;
import com.aps.ficcado_crm_backend.repository.InventoryHistoryRepository;
import com.aps.ficcado_crm_backend.service.ActivityLogService;
import com.aps.ficcado_crm_backend.service.SalesLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@org.springframework.validation.annotation.Validated
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
        log.debug("GET /api/logs/activity - fetching recent activity logs");
        return activityLogService.getRecent().stream()
                .map(LogsMapper::toActivityLogResponse)
                .toList();
    }

    @GetMapping("/activity/all")
    @Operation(summary = "All activity log entries")
    public List<ActivityLogResponse> getAllActivity() {
        log.debug("GET /api/logs/activity/all - fetching all activity logs");
        return activityLogService.getAll().stream()
                .map(LogsMapper::toActivityLogResponse)
                .toList();
    }

    // ── Sales Logs ────────────────────────────────────────────────────────────

    @GetMapping("/sales")
    @Operation(summary = "Recent sales narrative log (last 100 entries)")
    public List<SalesLogResponse> getSalesLogs() {
        log.debug("GET /api/logs/sales - fetching recent sales logs");
        return salesLogService.getRecent().stream()
                .map(LogsMapper::toSalesLogResponse)
                .toList();
    }

    @GetMapping("/sales/all")
    @Operation(summary = "All sales log entries")
    public List<SalesLogResponse> getAllSalesLogs() {
        log.debug("GET /api/logs/sales/all - fetching all sales logs");
        return salesLogService.getAll().stream()
                .map(LogsMapper::toSalesLogResponse)
                .toList();
    }

    @GetMapping("/sales/by-invoice/{invoiceNumber}")
    @Operation(summary = "Sales log entries for a specific invoice number")
    public List<SalesLogResponse> getSalesLogByInvoice(@PathVariable String invoiceNumber) {
        log.debug("GET /api/logs/sales/by-invoice/{} - fetching sales log by invoice", invoiceNumber);
        return salesLogService.getByInvoice(invoiceNumber)
                .stream()
                .map(LogsMapper::toSalesLogResponse)
                .toList();
    }

    // ── Inventory History ─────────────────────────────────────────────────────

    @GetMapping("/inventory-history")
    @Operation(summary = "Recent inventory history (last 200 entries)")
    public List<InventoryHistoryResponse> getInventoryHistory() {
        log.debug("GET /api/logs/inventory-history - fetching recent inventory history");
        return inventoryHistoryRepository.findTop200ByOrderByLoggedAtDesc()
                .stream()
                .map(LogsMapper::toInventoryHistoryResponse)
                .toList();
    }

    @GetMapping("/inventory-history/by-item/{itemId}")
    @Operation(summary = "Inventory history for a specific item")
    public List<InventoryHistoryResponse> getInventoryHistoryByItem(@PathVariable Long itemId) {
        log.debug("GET /api/logs/inventory-history/by-item/{} - fetching inventory history by item", itemId);
        return inventoryHistoryRepository.findByItemIdOrderByLoggedAtDesc(itemId)
                .stream()
                .map(LogsMapper::toInventoryHistoryResponse)
                .toList();
    }

    @GetMapping("/inventory-history/by-invoice/{invoiceNumber}")
    @Operation(summary = "Inventory history related to a specific invoice")
    public List<InventoryHistoryResponse> getInventoryHistoryByInvoice(@PathVariable String invoiceNumber) {
        log.debug("GET /api/logs/inventory-history/by-invoice/{} - fetching inventory history by invoice", invoiceNumber);
        return inventoryHistoryRepository.findByRelatedInvoiceNumberOrderByLoggedAtDesc(invoiceNumber)
                .stream()
                .map(LogsMapper::toInventoryHistoryResponse)
                .toList();
    }
}

