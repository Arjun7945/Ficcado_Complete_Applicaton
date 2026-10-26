package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Inventory;
import com.aps.ficcado_crm_backend.entity.InventoryHistory;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.WarehouseAllocation;
import com.aps.ficcado_crm_backend.entity.enums.AdminRole;
import com.aps.ficcado_crm_backend.entity.enums.InventoryTransactionType;
import com.aps.ficcado_crm_backend.repository.InventoryHistoryRepository;
import com.aps.ficcado_crm_backend.repository.InventoryRepository;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.repository.WarehouseAllocationRepository;
import com.aps.ficcado_crm_backend.service.ActivityLogService;
import com.aps.ficcado_crm_backend.service.InventoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private WarehouseAllocationRepository warehouseAllocationRepository;

    @Mock
    private InventoryHistoryRepository inventoryHistoryRepository;

    @Mock
    private ItemRepository itemRepository;

    @Mock
    private ActivityLogService activityLogService;

    @InjectMocks
    private InventoryService inventoryService;

    private Admin admin;
    private Item item;
    private Inventory inventory;

    @BeforeEach
    void setUp() {
        admin = Admin.builder()
                .id(1L)
                .adminName("Inv Admin")
                .emailId("admin@ficcado.com")
                .role(AdminRole.ADMIN)
                .build();

        item = Item.builder()
                .id(10L)
                .itemName("Oversized Hoodie")
                .build();

        inventory = Inventory.builder()
                .id(100L)
                .item(item)
                .size("L")
                .totalQuantity(20)
                .build();
    }

    @Test
    @DisplayName("deductFromInventory reduces stock and records history")
    void deductFromInventory_success() {
        when(inventoryRepository.findByItemIdAndSizeForUpdate(10L, "L")).thenReturn(Optional.of(inventory));
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(inv -> inv.getArgument(0));

        inventoryService.deductFromInventory(10L, "L", 5, "INV-101", "SALE", admin);

        assertEquals(15, inventory.getTotalQuantity());
        verify(inventoryRepository).save(inventory);
        verify(inventoryHistoryRepository).save(any(InventoryHistory.class));
    }

    @Test
    @DisplayName("deductFromInventory throws IllegalStateException when stock is insufficient")
    void deductFromInventory_insufficientStock_throwsIllegalStateException() {
        when(inventoryRepository.findByItemIdAndSizeForUpdate(10L, "L")).thenReturn(Optional.of(inventory));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> inventoryService.deductFromInventory(10L, "L", 25, "INV-102", "SALE", admin));
        assertTrue(ex.getMessage().contains("Insufficient stock"));
        verify(inventoryRepository, never()).save(any());
        verify(inventoryHistoryRepository, never()).save(any());
    }

    @Test
    @DisplayName("deductFromInventory throws IllegalArgumentException when itemId is null")
    void deductFromInventory_nullItemId_throwsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class,
                () -> inventoryService.deductFromInventory(null, "L", 5, "INV-103", "SALE", admin));
        verify(inventoryRepository, never()).findByItemIdAndSize(any(), any());
    }

    @Test
    @DisplayName("deductFromWarehouse reduces warehouse allocation quantity")
    void deductFromWarehouse_success() {
        WarehouseAllocation wa = WarehouseAllocation.builder()
                .id(50L)
                .item(item)
                .size("L")
                .quantity(10)
                .handlerAdmin(admin)
                .build();

        when(warehouseAllocationRepository.findByHandlerAdminIdAndItemIdAndSizeForUpdate(1L, 10L, "L"))
                .thenReturn(Optional.of(wa));
        when(warehouseAllocationRepository.save(any(WarehouseAllocation.class))).thenAnswer(inv -> inv.getArgument(0));

        inventoryService.deductFromWarehouse(1L, 10L, "L", 3, "INV-104", "SALE", admin);

        assertEquals(7, wa.getQuantity());
        verify(warehouseAllocationRepository).save(wa);
        verify(inventoryHistoryRepository).save(any(InventoryHistory.class));
    }

    @Test
    @DisplayName("restockInventory increases stock quantity")
    void restockInventory_success() {
        when(inventoryRepository.findByItemIdAndSize(10L, "L")).thenReturn(Optional.of(inventory));
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(inv -> inv.getArgument(0));

        inventoryService.restockInventory(10L, "L", 5, "INV-105",
                InventoryTransactionType.RETURN_REFUND, "INVENTORY", admin);

        assertEquals(25, inventory.getTotalQuantity());
        verify(inventoryRepository).save(inventory);
        verify(inventoryHistoryRepository).save(any(InventoryHistory.class));
    }

    @Test
    @DisplayName("adjustQuantity updates stock and writes activity log")
    void adjustQuantity_success() {
        when(inventoryRepository.findById(100L)).thenReturn(Optional.of(inventory));
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<Inventory> result = inventoryService.adjustQuantity(100L, 50, admin);

        assertTrue(result.isPresent());
        assertEquals(50, result.get().getTotalQuantity());
        verify(inventoryRepository).save(inventory);
        verify(activityLogService).log(eq(admin), eq("ADJUST"), eq("INVENTORY"), eq("inventory"), any(), any());
    }

    @Test
    @DisplayName("buildAdjustMessage: null reason omits separator (no trailing —)")
    void buildAdjustMessage_nullReason_omitsSeparator() {
        String msg = InventoryService.buildAdjustMessage("ETERNITY-BLACK", "L", 2, 5, null);
        assertEquals("Inventory adjusted: ETERNITY-BLACK size L from 2 → 5", msg);
    }

    @Test
    @DisplayName("buildAdjustMessage: empty reason omits separator")
    void buildAdjustMessage_emptyReason_omitsSeparator() {
        String msg = InventoryService.buildAdjustMessage("ETERNITY-BLACK", "L", 2, 5, "");
        assertEquals("Inventory adjusted: ETERNITY-BLACK size L from 2 → 5", msg);
    }

    @Test
    @DisplayName("buildAdjustMessage: blank reason omits separator")
    void buildAdjustMessage_blankReason_omitsSeparator() {
        String msg = InventoryService.buildAdjustMessage("ETERNITY-BLACK", "L", 2, 5, "   ");
        assertEquals("Inventory adjusted: ETERNITY-BLACK size L from 2 → 5", msg);
    }

    @Test
    @DisplayName("buildAdjustMessage: non-empty reason includes separator and trimmed reason")
    void buildAdjustMessage_nonEmptyReason_includesSeparator() {
        String msg = InventoryService.buildAdjustMessage("ETERNITY-BLACK", "L", 2, 5, "Damaged stock");
        assertEquals("Inventory adjusted: ETERNITY-BLACK size L from 2 → 5 — Damaged stock", msg);
    }

    @Test
    @DisplayName("adjustQuantity with non-empty reason logs formatted message to ActivityLogService")
    void adjustQuantity_withReason_logsFormattedMessage() {
        when(inventoryRepository.findById(100L)).thenReturn(Optional.of(inventory));
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(inv -> inv.getArgument(0));

        inventoryService.adjustQuantity(100L, 50, "Stock recount", admin);

        verify(activityLogService).log(
                eq(admin),
                eq("ADJUST"),
                eq("INVENTORY"),
                eq("inventory"),
                eq("100"),
                eq("Inventory adjusted: Oversized Hoodie size L from 20 → 50 — Stock recount")
        );
    }

    @Test
    @DisplayName("getUnallocatedQuantity calculates total stock minus allocations")
    void getUnallocatedQuantity_calculatesCorrectly() {
        when(inventoryRepository.findUnallocatedQuantity(10L, "L")).thenReturn(Optional.of(12));

        int unallocated = inventoryService.getUnallocatedQuantity(10L, "L");

        assertEquals(12, unallocated);
    }
}

