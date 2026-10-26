package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.dto.InternalOrderDto.*;
import com.aps.ficcado_crm_backend.entity.Customer;
import com.aps.ficcado_crm_backend.entity.CustomerAddress;
import com.aps.ficcado_crm_backend.entity.Inventory;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.Sale;
import com.aps.ficcado_crm_backend.entity.enums.ItemStatus;
import com.aps.ficcado_crm_backend.entity.enums.SaleStatus;
import com.aps.ficcado_crm_backend.repository.CustomerRepository;
import com.aps.ficcado_crm_backend.repository.InventoryRepository;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.repository.SaleRepository;
import com.aps.ficcado_crm_backend.service.SaleService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class InternalOrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SaleRepository saleRepository;

    @MockBean
    private ItemRepository itemRepository;

    @MockBean
    private InventoryRepository inventoryRepository;

    @MockBean
    private CustomerRepository customerRepository;

    @MockBean
    private SaleService saleService;

    private static final String SECRET = "ficcado-internal-service-secret-key-change-in-prod";

    @Test
    @DisplayName("createPaidSale returns 403 when X-Internal-Secret is missing or invalid")
    void rejectsWithoutSecret() throws Exception {
        CreatePaidSaleRequest request = new CreatePaidSaleRequest(
                "pay_test_123",
                "order_test_123",
                BigDecimal.valueOf(1499),
                "Tester",
                "test@ficcado.in",
                "9876543210",
                "Aluva, Kerala",
                BigDecimal.ZERO,
                "Shiprocket",
                List.of(new InternalOrderLineItem(1L, "Chosen", "L", 1, BigDecimal.valueOf(1499)))
        );

        mockMvc.perform(post("/api/internal/orders/create-paid-sale")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("createPaidSale returns existing sale on duplicate transaction (idempotent)")
    void returnsExistingOnDuplicate() throws Exception {
        Sale existingSale = Sale.builder()
                .id(88L)
                .invoiceNumber("FIC-INV-EXISTING")
                .totalAmount(BigDecimal.valueOf(1499))
                .saleStatus(SaleStatus.COMPLETED)
                .transactionId("pay_duplicate_123")
                .build();

        when(saleRepository.findByTransactionId("pay_duplicate_123")).thenReturn(Optional.of(existingSale));

        CreatePaidSaleRequest request = new CreatePaidSaleRequest(
                "pay_duplicate_123",
                "order_test_123",
                BigDecimal.valueOf(1499),
                "Tester",
                "test@ficcado.in",
                "9876543210",
                "Aluva, Kerala",
                BigDecimal.ZERO,
                "Shiprocket",
                List.of(new InternalOrderLineItem(1L, "Chosen", "L", 1, BigDecimal.valueOf(1499)))
        );

        mockMvc.perform(post("/api/internal/orders/create-paid-sale")
                        .header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.isDuplicate").value(true))
                .andExpect(jsonPath("$.invoiceNumber").value("FIC-INV-EXISTING"))
                .andExpect(jsonPath("$.saleId").value(88));

        verify(saleService, never()).createSale(any(), any());
    }

    @Test
    @DisplayName("createPaidSale successfully creates sale and deducts stock when authorized")
    void createsSaleSuccessfully() throws Exception {
        when(saleRepository.findByTransactionId(anyString())).thenReturn(Optional.empty());

        Item item = Item.builder()
                .id(1L)
                .itemName("Chosen")
                .priceOfItem(BigDecimal.valueOf(1499))
                .currentStatus(ItemStatus.ACTIVE)
                .build();
        when(itemRepository.findById(1L)).thenReturn(Optional.of(item));

        Inventory inventory = Inventory.builder().id(10L).item(item).size("L").totalQuantity(5).build();
        when(inventoryRepository.findByItemIdAndSizeForUpdate(1L, "L")).thenReturn(Optional.of(inventory));

        Sale saved = Sale.builder()
                .id(99L)
                .invoiceNumber("FIC-INV-NEW")
                .totalAmount(BigDecimal.valueOf(1499))
                .saleStatus(SaleStatus.COMPLETED)
                .build();
        when(saleService.createSale(any(), isNull())).thenReturn(saved);

        CreatePaidSaleRequest request = new CreatePaidSaleRequest(
                "pay_new_123",
                "order_test_123",
                BigDecimal.valueOf(1499),
                "Tester",
                "test@ficcado.in",
                "9876543210",
                "Aluva, Kerala",
                BigDecimal.ZERO,
                "Shiprocket",
                List.of(new InternalOrderLineItem(1L, "Chosen", "L", 1, BigDecimal.valueOf(1499)))
        );

        mockMvc.perform(post("/api/internal/orders/create-paid-sale")
                        .header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.isDuplicate").value(false))
                .andExpect(jsonPath("$.saleId").value(99))
                .andExpect(jsonPath("$.invoiceNumber").value("FIC-INV-NEW"));
    }

    @Test
    @DisplayName("website-orders alias endpoint creates sale with remarks 'WEBSITE SALE'")
    void createsSaleSuccessfullyViaWebsiteOrdersAlias() throws Exception {
        when(saleRepository.findByTransactionId(anyString())).thenReturn(Optional.empty());

        Item item = Item.builder()
                .id(1L)
                .itemName("Chosen")
                .priceOfItem(BigDecimal.valueOf(1499))
                .currentStatus(ItemStatus.ACTIVE)
                .build();
        when(itemRepository.findById(1L)).thenReturn(Optional.of(item));

        Inventory inventory = Inventory.builder().id(10L).item(item).size("L").totalQuantity(5).build();
        when(inventoryRepository.findByItemIdAndSizeForUpdate(1L, "L")).thenReturn(Optional.of(inventory));

        Sale saved = Sale.builder()
                .id(101L)
                .invoiceNumber("FIC-INV-101")
                .totalAmount(BigDecimal.valueOf(1499))
                .saleStatus(SaleStatus.COMPLETED)
                .remarks("WEBSITE SALE")
                .build();
        when(saleService.createSale(any(), isNull())).thenReturn(saved);

        CreatePaidSaleRequest request = new CreatePaidSaleRequest(
                "pay_alias_123",
                "order_alias_123",
                BigDecimal.valueOf(1499),
                "Tester",
                "test@ficcado.in",
                "9876543210",
                "Aluva, Kerala",
                BigDecimal.ZERO,
                "Shiprocket",
                List.of(new InternalOrderLineItem(1L, "Chosen", "L", 1, BigDecimal.valueOf(1499)))
        );

        mockMvc.perform(post("/api/internal/orders/website-orders")
                        .header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.saleId").value(101));

        ArgumentCaptor<Sale> captor = ArgumentCaptor.forClass(Sale.class);
        verify(saleService).createSale(captor.capture(), isNull());
        assertEquals("WEBSITE SALE", captor.getValue().getRemarks());
    }

    @Test
    @DisplayName("createPaidSale returns 409 Conflict when item is out of stock")
    void returns409WhenOutOfStock() throws Exception {
        when(saleRepository.findByTransactionId(anyString())).thenReturn(Optional.empty());

        Item item = Item.builder()
                .id(1L)
                .itemName("Chosen")
                .priceOfItem(BigDecimal.valueOf(1499))
                .currentStatus(ItemStatus.ACTIVE)
                .build();
        when(itemRepository.findById(1L)).thenReturn(Optional.of(item));

        Inventory inventory = Inventory.builder().id(10L).item(item).size("L").totalQuantity(0).build();
        when(inventoryRepository.findByItemIdAndSizeForUpdate(1L, "L")).thenReturn(Optional.of(inventory));

        CreatePaidSaleRequest request = new CreatePaidSaleRequest(
                "pay_oos_123",
                "order_test_123",
                BigDecimal.valueOf(1499),
                "Tester",
                "test@ficcado.in",
                "9876543210",
                "Aluva, Kerala",
                BigDecimal.ZERO,
                "Shiprocket",
                List.of(new InternalOrderLineItem(1L, "Chosen", "L", 1, BigDecimal.valueOf(1499)))
        );

        mockMvc.perform(post("/api/internal/orders/create-paid-sale")
                        .header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));

        verify(saleService, never()).createSale(any(), any());
    }

    @Test
    @DisplayName("createPaidSale returns 409 Conflict when client amount differs from database item price")
    void returns409WhenAmountMismatch() throws Exception {
        when(saleRepository.findByTransactionId(anyString())).thenReturn(Optional.empty());

        Item item = Item.builder()
                .id(1L)
                .itemName("Chosen")
                .priceOfItem(BigDecimal.valueOf(1499))
                .currentStatus(ItemStatus.ACTIVE)
                .build();
        when(itemRepository.findById(1L)).thenReturn(Optional.of(item));

        Inventory inventory = Inventory.builder().id(10L).item(item).size("L").totalQuantity(10).build();
        when(inventoryRepository.findByItemIdAndSizeForUpdate(1L, "L")).thenReturn(Optional.of(inventory));

        // Client claims total was 999, but item in DB is 1499
        CreatePaidSaleRequest request = new CreatePaidSaleRequest(
                "pay_mismatch_123",
                "order_test_123",
                BigDecimal.valueOf(999),
                "Tester",
                "test@ficcado.in",
                "9876543210",
                "Aluva, Kerala",
                BigDecimal.ZERO,
                "Shiprocket",
                List.of(new InternalOrderLineItem(1L, "Chosen", "L", 1, BigDecimal.valueOf(1499)))
        );

        mockMvc.perform(post("/api/internal/orders/create-paid-sale")
                        .header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("AMOUNT_MISMATCH")));

        verify(saleService, never()).createSale(any(), any());
    }

    @Test
    @DisplayName("resolves customer details from CustomerRepository when customerId is provided")
    void resolvesCustomerFromRepository() throws Exception {
        when(saleRepository.findByTransactionId(anyString())).thenReturn(Optional.empty());

        Item item = Item.builder()
                .id(1L)
                .itemName("Chosen")
                .priceOfItem(BigDecimal.valueOf(1499))
                .currentStatus(ItemStatus.ACTIVE)
                .build();
        when(itemRepository.findById(1L)).thenReturn(Optional.of(item));

        Inventory inventory = Inventory.builder().id(10L).item(item).size("L").totalQuantity(5).build();
        when(inventoryRepository.findByItemIdAndSizeForUpdate(1L, "L")).thenReturn(Optional.of(inventory));

        Customer dbCustomer = Customer.builder()
                .id(42L)
                .customerName("Verified Customer")
                .emailId("verified@ficcado.com")
                .phoneNumber("9998887776")
                .build();
        when(customerRepository.findById(42L)).thenReturn(Optional.of(dbCustomer));

        Sale saved = Sale.builder()
                .id(200L)
                .invoiceNumber("FIC-INV-200")
                .totalAmount(BigDecimal.valueOf(1499))
                .saleStatus(SaleStatus.COMPLETED)
                .build();
        when(saleService.createSale(any(), isNull())).thenReturn(saved);

        // Client passes arbitrary unverified name/email/phone, but customerId=42
        CreatePaidSaleRequest request = new CreatePaidSaleRequest(
                "pay_cust_123",
                "order_cust_123",
                BigDecimal.valueOf(1499),
                42L,
                "Spoofed Name",
                "spoofed@evil.com",
                "0000000000",
                "Some Address",
                BigDecimal.ZERO,
                "Shiprocket",
                List.of(new InternalOrderLineItem(1L, "Chosen", "L", 1, BigDecimal.valueOf(1499)))
        );

        mockMvc.perform(post("/api/internal/orders/website-orders")
                        .header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));

        ArgumentCaptor<Sale> captor = ArgumentCaptor.forClass(Sale.class);
        verify(saleService).createSale(captor.capture(), isNull());
        Sale createdSale = captor.getValue();
        assertEquals("Verified Customer", createdSale.getCustomerName());
        assertEquals("verified@ficcado.com", createdSale.getCustomerEmail());
        assertEquals("9998887776", createdSale.getCustomerPhoneNumber());
        assertEquals("WEBSITE SALE", createdSale.getRemarks());
    }
}
