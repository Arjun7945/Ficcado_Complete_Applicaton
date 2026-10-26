package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.dto.InternalOrderDto.*;
import com.aps.ficcado_crm_backend.entity.Inventory;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.enums.ItemStatus;
import com.aps.ficcado_crm_backend.repository.InventoryRepository;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class InternalQuoteTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ItemRepository itemRepository;

    @MockBean
    private InventoryRepository inventoryRepository;

    private static final String SECRET = "ficcado-internal-service-secret-key-change-in-prod";

    @Test
    @DisplayName("calculateQuote returns 403 when X-Internal-Secret is missing")
    void rejectsWithoutSecret() throws Exception {
        QuoteRequest request = new QuoteRequest(
                List.of(new QuoteRequestItem(1L, "M", 2)),
                "del-standard"
        );

        mockMvc.perform(post("/api/internal/orders/quote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.valid").value(false));
    }

    @Test
    @DisplayName("calculateQuote computes server unit prices, line totals, and standard delivery charge from DB")
    void calculatesStandardQuoteFromDatabase() throws Exception {
        Item item = Item.builder()
                .id(1L)
                .itemName("CHOSEN")
                .priceOfItem(BigDecimal.valueOf(1499))
                .currentStatus(ItemStatus.ACTIVE)
                .build();

        Inventory inv = Inventory.builder()
                .id(10L)
                .item(item)
                .size("M")
                .totalQuantity(5)
                .build();

        when(itemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(inventoryRepository.findByItemIdAndSize(1L, "M")).thenReturn(Optional.of(inv));

        QuoteRequest request = new QuoteRequest(
                List.of(new QuoteRequestItem(1L, "M", 2)),
                "del-standard"
        );

        mockMvc.perform(post("/api/internal/orders/quote")
                        .header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.subtotal").value(2998))
                .andExpect(jsonPath("$.deliveryCharge").value(0))
                .andExpect(jsonPath("$.totalAmount").value(2998))
                .andExpect(jsonPath("$.courierName").value("Express Surface Logistics"))
                .andExpect(jsonPath("$.lineItems[0].itemId").value(1))
                .andExpect(jsonPath("$.lineItems[0].unitPrice").value(1499))
                .andExpect(jsonPath("$.lineItems[0].lineTotal").value(2998))
                .andExpect(jsonPath("$.lineItems[0].available").value(true));
    }

    @Test
    @DisplayName("calculateQuote applies server delivery charge for priority courier")
    void calculatesPriorityQuoteWithCourierRate() throws Exception {
        Item item = Item.builder()
                .id(2L)
                .itemName("GROUNDED")
                .priceOfItem(BigDecimal.valueOf(1299))
                .currentStatus(ItemStatus.IN_STOCK)
                .build();

        Inventory inv = Inventory.builder()
                .id(20L)
                .item(item)
                .size("L")
                .totalQuantity(10)
                .build();

        when(itemRepository.findById(2L)).thenReturn(Optional.of(item));
        when(inventoryRepository.findByItemIdAndSize(2L, "L")).thenReturn(Optional.of(inv));

        QuoteRequest request = new QuoteRequest(
                List.of(new QuoteRequestItem(2L, "L", 1)),
                "del-priority"
        );

        mockMvc.perform(post("/api/internal/orders/quote")
                        .header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.subtotal").value(1299))
                .andExpect(jsonPath("$.deliveryCharge").value(99))
                .andExpect(jsonPath("$.totalAmount").value(1398))
                .andExpect(jsonPath("$.courierName").value("Priority Air Courier"));
    }

    @Test
    @DisplayName("calculateQuote returns valid=false when item has insufficient stock")
    void rejectsOutOfStockItem() throws Exception {
        Item item = Item.builder()
                .id(1L)
                .itemName("CHOSEN")
                .priceOfItem(BigDecimal.valueOf(1499))
                .currentStatus(ItemStatus.ACTIVE)
                .build();

        Inventory inv = Inventory.builder()
                .id(10L)
                .item(item)
                .size("XL")
                .totalQuantity(1)
                .build();

        when(itemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(inventoryRepository.findByItemIdAndSize(1L, "XL")).thenReturn(Optional.of(inv));

        QuoteRequest request = new QuoteRequest(
                List.of(new QuoteRequestItem(1L, "XL", 3)),
                "del-standard"
        );

        mockMvc.perform(post("/api/internal/orders/quote")
                        .header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.lineItems[0].available").value(false))
                .andExpect(jsonPath("$.lineItems[0].error").value("Insufficient stock. Available: 1"));
    }

    @Test
    @DisplayName("calculateQuote returns 400 when courierId is unknown")
    void rejectsUnknownCourier() throws Exception {
        Item item = Item.builder()
                .id(1L)
                .itemName("CHOSEN")
                .priceOfItem(BigDecimal.valueOf(1499))
                .currentStatus(ItemStatus.ACTIVE)
                .build();

        Inventory inv = Inventory.builder()
                .id(10L)
                .item(item)
                .size("M")
                .totalQuantity(5)
                .build();

        when(itemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(inventoryRepository.findByItemIdAndSize(1L, "M")).thenReturn(Optional.of(inv));

        QuoteRequest request = new QuoteRequest(
                List.of(new QuoteRequestItem(1L, "M", 1)),
                "del-fake-carrier"
        );

        mockMvc.perform(post("/api/internal/orders/quote")
                        .header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.message").value("Unknown courier option: del-fake-carrier"));
    }
}
