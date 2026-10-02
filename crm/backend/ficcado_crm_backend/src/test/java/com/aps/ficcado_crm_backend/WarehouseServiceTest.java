package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.dto.WarehouseDto.WarehouseRequest;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.WarehouseAllocation;
import com.aps.ficcado_crm_backend.entity.enums.AdminRole;
import com.aps.ficcado_crm_backend.repository.AdminRepository;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.repository.WarehouseAllocationRepository;
import com.aps.ficcado_crm_backend.service.ActivityLogService;
import com.aps.ficcado_crm_backend.service.InventoryService;
import com.aps.ficcado_crm_backend.service.WarehouseService;
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
class WarehouseServiceTest {

    @Mock
    private WarehouseAllocationRepository warehouseRepo;

    @Mock
    private ItemRepository itemRepository;

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private InventoryService inventoryService;

    @Mock
    private ActivityLogService activityLogService;

    @InjectMocks
    private WarehouseService warehouseService;

    private Admin admin;
    private Item item;

    @BeforeEach
    void setUp() {
        admin = Admin.builder()
                .id(1L)
                .adminName("Warehouse Admin")
                .emailId("wh@ficcado.com")
                .role(AdminRole.ADMIN)
                .build();

        item = Item.builder()
                .id(10L)
                .itemName("Oversized Tee - Black")
                .build();
    }

    @Test
    @DisplayName("createAllocation succeeds when allocation is within unallocated cap")
    void createAllocation_success() {
        WarehouseRequest request = new WarehouseRequest(
                "Bangalore WH", 1L, "Warehouse Admin", 10L, "Oversized Tee - Black", "L", 5
        );

        when(itemRepository.findById(10L)).thenReturn(Optional.of(item));
        when(inventoryService.getUnallocatedQuantity(10L, "L")).thenReturn(10);
        when(adminRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(warehouseRepo.save(any(WarehouseAllocation.class))).thenAnswer(inv -> {
            WarehouseAllocation wa = inv.getArgument(0);
            wa.setId(100L);
            return wa;
        });

        WarehouseAllocation created = warehouseService.createAllocation(request, admin);

        assertNotNull(created);
        assertEquals(100L, created.getId());
        assertEquals("Bangalore WH", created.getWarehouseLocation());
        assertEquals(5, created.getQuantity());
        verify(activityLogService).log(eq(admin), eq("CREATE"), eq("WAREHOUSE"), eq("warehouse"), any(), any());
    }

    @Test
    @DisplayName("createAllocation throws IllegalArgumentException when item does not exist")
    void createAllocation_itemNotFound_throwsException() {
        WarehouseRequest request = new WarehouseRequest(
                "Main WH", null, null, 999L, "Nonexistent", "M", 2
        );

        when(itemRepository.findById(999L)).thenReturn(Optional.empty());
        when(itemRepository.findByItemNameIgnoreCase("Nonexistent")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> warehouseService.createAllocation(request, admin));
        verify(warehouseRepo, never()).save(any());
    }

    @Test
    @DisplayName("createAllocation throws IllegalStateException when requested qty exceeds unallocated cap")
    void createAllocation_exceedsCap_throwsIllegalStateException() {
        WarehouseRequest request = new WarehouseRequest(
                "Bangalore WH", null, null, 10L, "Oversized Tee - Black", "L", 15
        );

        when(itemRepository.findById(10L)).thenReturn(Optional.of(item));
        when(inventoryService.getUnallocatedQuantity(10L, "L")).thenReturn(5);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> warehouseService.createAllocation(request, admin));
        assertTrue(ex.getMessage().contains("Cannot allocate 15 piece(s). Only 5 piece(s) remain unallocated"));
        verify(warehouseRepo, never()).save(any());
    }

    @Test
    @DisplayName("updateQuantity updates fields and writes activity log")
    void updateQuantity_success() {
        WarehouseAllocation existing = WarehouseAllocation.builder()
                .id(50L)
                .item(item)
                .size("M")
                .quantity(3)
                .warehouseLocation("Old Location")
                .build();

        when(warehouseRepo.findById(50L)).thenReturn(Optional.of(existing));
        when(inventoryService.getUnallocatedQuantity(10L, "M")).thenReturn(10);
        when(warehouseRepo.save(any(WarehouseAllocation.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<WarehouseAllocation> result = warehouseService.updateQuantity(50L, 8, admin);

        assertTrue(result.isPresent());
        assertEquals(8, result.get().getQuantity());
        verify(activityLogService).log(eq(admin), eq("UPDATE"), eq("WAREHOUSE"), eq("warehouse"), eq("50"), any());
    }

    @Test
    @DisplayName("deleteAllocation deletes allocation when found and logs activity")
    void deleteAllocation_success() {
        WarehouseAllocation existing = WarehouseAllocation.builder()
                .id(75L)
                .item(item)
                .size("S")
                .quantity(4)
                .build();

        when(warehouseRepo.findById(75L)).thenReturn(Optional.of(existing));

        boolean deleted = warehouseService.deleteAllocation(75L, admin);

        assertTrue(deleted);
        verify(warehouseRepo).deleteById(75L);
        verify(activityLogService).log(eq(admin), eq("DELETE"), eq("WAREHOUSE"), eq("warehouse"), eq("75"), any());
    }
}
