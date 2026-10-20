package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.entity.enums.DeliveryStatus;
import com.aps.ficcado_crm_backend.entity.enums.FulfilmentSource;
import com.aps.ficcado_crm_backend.entity.enums.SaleStatus;
import com.aps.ficcado_crm_backend.exception.SaleLockedException;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.SaleLineItem;
import com.aps.ficcado_crm_backend.entity.Replacement;
import com.aps.ficcado_crm_backend.entity.ReturnRefund;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.repository.ReplacementRepository;
import com.aps.ficcado_crm_backend.repository.ReturnRefundRepository;
import com.aps.ficcado_crm_backend.repository.SaleRepository;
import com.aps.ficcado_crm_backend.service.ActivityLogService;
import com.aps.ficcado_crm_backend.service.CustomerService;
import com.aps.ficcado_crm_backend.service.InventoryService;
import com.aps.ficcado_crm_backend.service.ReviewService;
import com.aps.ficcado_crm_backend.service.SaleService;
import com.aps.ficcado_crm_backend.service.SalesLogService;
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
    private ItemRepository itemRepository;

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

    @Mock
    private ReplacementRepository replacementRepository;

    @Mock
    private ReturnRefundRepository returnRefundRepository;

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

    @Test
    @DisplayName("Create sale resolves item by name and deducts inventory with valid item ID")
    void createSale_resolvesItemByNameAndDeductsInventory() {
        Item resolvedItem = Item.builder().id(42L).itemName("ETERNITY - BLACK").build();
        when(itemRepository.findByItemNameIgnoreCase("ETERNITY - BLACK")).thenReturn(Optional.of(resolvedItem));

        SaleLineItem lineItem = SaleLineItem.builder()
                .itemName("ETERNITY - BLACK")
                .size("L")
                .quantity(2)
                .priceEach(new BigDecimal("1500"))
                .totalPrice(new BigDecimal("3000"))
                .build();

        List<SaleLineItem> items = new ArrayList<>();
        items.add(lineItem);

        Sale sale = Sale.builder()
                .invoiceNumber("INV-999")
                .saleStatus(SaleStatus.COMPLETED)
                .deliveryStatus(DeliveryStatus.DELIVERED)
                .fulfilmentSource(FulfilmentSource.TAKE_FROM_INVENTORY)
                .customerName("Jane Doe")
                .customerPhoneNumber("9123456780")
                .totalAmount(new BigDecimal("3000"))
                .lineItems(items)
                .build();

        when(saleRepository.save(any(Sale.class))).thenReturn(sale);

        Sale created = saleService.createSale(sale, admin);

        assertNotNull(created);
        assertEquals(resolvedItem, lineItem.getItem());
        verify(inventoryService).deductFromInventory(eq(42L), eq("L"), eq(2), eq("INV-999"), eq("SALE"), eq(admin));
    }

    @Test
    @DisplayName("Create sale throws IllegalStateException if item cannot be resolved from catalog")
    void createSale_throwsIfItemNotFoundInCatalog() {
        when(itemRepository.findByItemNameIgnoreCase("UNKNOWN ITEM")).thenReturn(Optional.empty());

        SaleLineItem lineItem = SaleLineItem.builder()
                .itemName("UNKNOWN ITEM")
                .size("M")
                .quantity(1)
                .build();

        List<SaleLineItem> items = new ArrayList<>();
        items.add(lineItem);

        Sale sale = Sale.builder()
                .invoiceNumber("INV-ERR")
                .saleStatus(SaleStatus.COMPLETED)
                .deliveryStatus(DeliveryStatus.DELIVERED)
                .fulfilmentSource(FulfilmentSource.TAKE_FROM_INVENTORY)
                .lineItems(items)
                .build();

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> saleService.createSale(sale, admin));
        assertTrue(ex.getMessage().contains("UNKNOWN ITEM"));
        verifyNoInteractions(inventoryService);
    }

    @Test
    @DisplayName("updateSale in-place preserves invoiceNumber and lineItems while updating non-null fields")
    void updateSale_inPlacePreservesOmittedFields() {
        SaleLineItem existingLine = SaleLineItem.builder()
                .id(10L)
                .itemName("SHIRT")
                .size("M")
                .quantity(1)
                .priceEach(new BigDecimal("500"))
                .totalPrice(new BigDecimal("500"))
                .build();

        Sale existing = Sale.builder()
                .id(5L)
                .invoiceNumber("INV-005")
                .saleStatus(SaleStatus.COMPLETED)
                .deliveryStatus(DeliveryStatus.IN_TRANSIT)
                .customerName("Original Name")
                .customerPhoneNumber("1111111111")
                .lineItems(new ArrayList<>(List.of(existingLine)))
                .totalAmount(new BigDecimal("500"))
                .build();

        when(saleRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(saleRepository.save(any(Sale.class))).thenAnswer(i -> i.getArgument(0));

        Sale patch = Sale.builder()
                .customerName("Updated Name")
                .deliveryStatus(DeliveryStatus.DELIVERED)
                .build();

        Sale updated = saleService.updateSale(5L, patch, admin);

        assertEquals("INV-005", updated.getInvoiceNumber());
        assertEquals("Updated Name", updated.getCustomerName());
        assertEquals("1111111111", updated.getCustomerPhoneNumber());
        assertEquals(DeliveryStatus.DELIVERED, updated.getDeliveryStatus());
        assertEquals(1, updated.getLineItems().size());
        verify(saleRepository).save(existing);
    }

    @Test
    @DisplayName("addItemsToSale resolves item, deducts stock, and appends to sale")
    void addItemsToSale_deductsStockAndAppends() {
        Item resolvedItem = Item.builder().id(99L).itemName("HOODIE").build();
        when(itemRepository.findByItemNameIgnoreCase("HOODIE")).thenReturn(Optional.of(resolvedItem));

        Sale existing = Sale.builder()
                .id(8L)
                .invoiceNumber("INV-008")
                .saleStatus(SaleStatus.COMPLETED)
                .deliveryStatus(DeliveryStatus.DELIVERED)
                .fulfilmentSource(FulfilmentSource.TAKE_FROM_INVENTORY)
                .lineItems(new ArrayList<>())
                .totalAmount(BigDecimal.ZERO)
                .build();

        when(saleRepository.findById(8L)).thenReturn(Optional.of(existing));
        when(saleRepository.save(any(Sale.class))).thenAnswer(i -> i.getArgument(0));

        SaleLineItem toAdd = SaleLineItem.builder()
                .itemName("HOODIE")
                .size("XL")
                .quantity(3)
                .priceEach(new BigDecimal("1000"))
                .totalPrice(new BigDecimal("3000"))
                .build();

        Sale result = saleService.addItemsToSale(8L, List.of(toAdd), admin);

        assertEquals(1, result.getLineItems().size());
        assertEquals(new BigDecimal("3000"), result.getTotalAmount());
        verify(inventoryService).deductFromInventory(eq(99L), eq("XL"), eq(3), eq("INV-008"), eq("SALE"), eq(admin));
        verify(saleRepository).save(existing);
    }

    @Test
    @DisplayName("markSaleCompleted sets status, closedByAdmin, and fulfilmentRequestStatus to Completed")
    void markSaleCompleted_setsClosedByAdminAndStatus() {
        Sale existing = Sale.builder()
                .id(15L)
                .invoiceNumber("INV-015")
                .saleStatus(SaleStatus.NOT_PROVIDED_OR_ORDER_ONLY_PLACED)
                .fulfilmentRequestStatus("Normal")
                .totalAmount(new BigDecimal("1500"))
                .build();

        when(saleRepository.findById(15L)).thenReturn(Optional.of(existing));
        when(saleRepository.save(any(Sale.class))).thenAnswer(i -> i.getArgument(0));

        Sale completed = saleService.markSaleCompleted(
                15L, "Paid", "UPI", "TXN-123456", "DELIVERED", "Customer", "Smooth delivery", admin);

        assertEquals(SaleStatus.PURCHASE_SATISFIED_AND_ORDER_COMPLETED, completed.getSaleStatus());
        assertEquals("Completed", completed.getFulfilmentRequestStatus());
        assertEquals(DeliveryStatus.DELIVERED, completed.getDeliveryStatus());
        assertEquals("UPI", completed.getModeOfPayment());
        assertEquals("TXN-123456", completed.getTransactionId());
        assertNotNull(completed.getSaleClosedByAdmin());
        assertEquals(admin.getId(), completed.getSaleClosedByAdmin().getId());
        assertEquals(admin, completed.getUpdatedByAdmin());
        verify(saleRepository).save(existing);
        verify(salesLogService).log(eq(admin), eq("Sales"), eq("COMPLETE"), eq("INV-015"), anyString());
    }

    @Test
    @DisplayName("updateSale with completed status automatically sets saleClosedByAdmin")
    void updateSale_completedStatusSetsSaleClosedByAdmin() {
        Sale existing = Sale.builder()
                .id(20L)
                .invoiceNumber("INV-020")
                .saleStatus(SaleStatus.NOT_PROVIDED_OR_ORDER_ONLY_PLACED)
                .fulfilmentRequestStatus("Normal")
                .build();

        when(saleRepository.findById(20L)).thenReturn(Optional.of(existing));
        when(saleRepository.save(any(Sale.class))).thenAnswer(i -> i.getArgument(0));

        Sale patch = Sale.builder()
                .saleStatus(SaleStatus.PURCHASE_SATISFIED_AND_ORDER_COMPLETED)
                .build();

        Sale updated = saleService.updateSale(20L, patch, admin);

        assertEquals(SaleStatus.PURCHASE_SATISFIED_AND_ORDER_COMPLETED, updated.getSaleStatus());
        assertEquals("Completed", updated.getFulfilmentRequestStatus());
        assertNotNull(updated.getSaleClosedByAdmin());
        assertEquals(admin.getId(), updated.getSaleClosedByAdmin().getId());
    }

    @Test
    @DisplayName("unlockSale sets saleClosedByAdmin and fulfilmentRequestStatus to Completed")
    void unlockSale_setsSaleClosedByAdmin() {
        Sale existing = Sale.builder()
                .id(25L)
                .invoiceNumber("INV-025")
                .saleStatus(SaleStatus.REPLACE_REQUESTED)
                .fulfilmentRequestStatus("Replace-Requested")
                .build();

        when(saleRepository.findById(25L)).thenReturn(Optional.of(existing));
        when(saleRepository.save(any(Sale.class))).thenAnswer(i -> i.getArgument(0));

        Sale unlocked = saleService.unlockSale(25L, admin);

        assertEquals(SaleStatus.PURCHASE_SATISFIED_AND_ORDER_COMPLETED, unlocked.getSaleStatus());
        assertEquals("Completed", unlocked.getFulfilmentRequestStatus());
        assertNotNull(unlocked.getSaleClosedByAdmin());
        assertEquals(admin.getId(), unlocked.getSaleClosedByAdmin().getId());
    }

    @Test
    @DisplayName("requestReplacement locks sale and auto-initializes Replacement ticket")
    void requestReplacement_locksSaleAndInitializesTicket() {
        Sale existing = Sale.builder()
                .id(30L)
                .invoiceNumber("INV-030")
                .saleStatus(SaleStatus.PURCHASE_SATISFIED_AND_ORDER_COMPLETED)
                .fulfilmentRequestStatus("Normal")
                .build();

        when(saleRepository.findById(30L)).thenReturn(Optional.of(existing));
        when(saleRepository.save(any(Sale.class))).thenAnswer(i -> i.getArgument(0));
        when(replacementRepository.findByInvoiceNumber("INV-030")).thenReturn(Optional.empty());

        Sale updated = saleService.requestReplacement(30L, admin);

        assertEquals(SaleStatus.REPLACE_REQUESTED, updated.getSaleStatus());
        assertEquals("Replace-Requested", updated.getFulfilmentRequestStatus());
        assertEquals(admin.getId(), updated.getUpdatedByAdmin().getId());
        verify(replacementRepository, times(1)).save(any(Replacement.class));
    }

    @Test
    @DisplayName("requestRefund locks sale and auto-initializes ReturnRefund ticket")
    void requestRefund_locksSaleAndInitializesTicket() {
        Sale existing = Sale.builder()
                .id(31L)
                .invoiceNumber("INV-031")
                .saleStatus(SaleStatus.PURCHASE_SATISFIED_AND_ORDER_COMPLETED)
                .fulfilmentRequestStatus("Normal")
                .build();

        when(saleRepository.findById(31L)).thenReturn(Optional.of(existing));
        when(saleRepository.save(any(Sale.class))).thenAnswer(i -> i.getArgument(0));
        when(returnRefundRepository.findByInvoiceNumber("INV-031")).thenReturn(Optional.empty());

        Sale updated = saleService.requestRefund(31L, admin);

        assertEquals(SaleStatus.REFUND_REQUESTED, updated.getSaleStatus());
        assertEquals("Refund-Requested", updated.getFulfilmentRequestStatus());
        assertEquals(admin.getId(), updated.getUpdatedByAdmin().getId());
        verify(returnRefundRepository, times(1)).save(any(ReturnRefund.class));
    }
}
