package com.aps.ficcado_inventory_sales_management_app;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.Sale;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.DeliveryStatus;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.FulfilmentSource;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.SaleStatus;
import com.aps.ficcado_inventory_sales_management_app.exception.SaleLockedException;
import com.aps.ficcado_inventory_sales_management_app.repository.SaleRepository;
import com.aps.ficcado_inventory_sales_management_app.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SaleServiceTest {

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private InventoryService inventoryService;

    @Mock
    private CustomerService customerService;

    @Mock
    private ActivityLogService activityLogService;

    @Mock
    private SalesLogService salesLogService;

    @Mock
    private ReviewService reviewService;

    @InjectMocks
    private SaleService saleService;

    private Admin admin;

    @BeforeEach
    void setUp() {
        admin = Admin.builder()
                .id(1L)
                .adminName("Tester")
                .emailId("tester@ficcado.com")
                .build();
    }

    @Test
    @DisplayName("Locked sale cannot be updated")
    void updateSale_lockedSaleThrowsException() {
        Sale locked = Sale.builder()
                .id(100L)
                .invoiceNumber("INV-100")
                .saleStatus(SaleStatus.REPLACE_REQUESTED)
                .build();

        when(saleRepository.findById(100L)).thenReturn(Optional.of(locked));

        assertThrows(SaleLockedException.class, () -> saleService.updateSale(locked, admin));
        verify(saleRepository, never()).save(any());
    }

    @Test
    @DisplayName("Sale status is locked when REPLACE_REQUESTED or REFUND_REQUESTED")
    void isSaleLocked_detectsLockingStatuses() {
        Sale sale = Sale.builder().saleStatus(SaleStatus.REPLACE_REQUESTED).build();
        assertTrue(saleService.isSaleLocked(sale));

        sale.setSaleStatus(SaleStatus.REFUND_REQUESTED);
        assertTrue(saleService.isSaleLocked(sale));

        sale.setSaleStatus(SaleStatus.COMPLETED);
        assertFalse(saleService.isSaleLocked(sale));
    }

    @Test
    @DisplayName("Create sale saves record and triggers audit logs")
    void createSale_persistsAndLogs() {
        Sale newSale = Sale.builder()
                .invoiceNumber("INV-001")
                .saleStatus(SaleStatus.COMPLETED)
                .deliveryStatus(DeliveryStatus.DELIVERED)
                .fulfilmentSource(FulfilmentSource.TAKE_FROM_INVENTORY)
                .customerName("John Doe")
                .customerPhoneNumber("9876543210")
                .totalAmount(new BigDecimal("1500"))
                .lineItems(new ArrayList<>())
                .build();

        when(saleRepository.save(any(Sale.class))).thenReturn(newSale);

        Sale created = saleService.createSale(newSale, admin);

        assertNotNull(created);
        assertEquals("INV-001", created.getInvoiceNumber());
        verify(saleRepository).save(newSale);
        verify(activityLogService).log(eq(admin), eq("CREATE"), eq("SALES"), eq("sales"), anyString(), anyString());
    }

    @Test
    @DisplayName("Keyset pagination delegates correctly to repository")
    void getPageBefore_delegatesToRepository() {
        when(saleRepository.findPageBeforeId(eq(50L), any()))
                .thenReturn(List.of());

        List<Sale> page = saleService.getPageBefore(50L, 20);
        assertNotNull(page);
        verify(saleRepository).findPageBeforeId(eq(50L), any());
    }
}
