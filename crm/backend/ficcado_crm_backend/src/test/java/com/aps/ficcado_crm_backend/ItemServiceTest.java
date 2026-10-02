package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.ItemSize;
import com.aps.ficcado_crm_backend.entity.enums.AdminRole;
import com.aps.ficcado_crm_backend.entity.enums.ItemStatus;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.service.ActivityLogService;
import com.aps.ficcado_crm_backend.service.ItemService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ItemServiceTest {

    @Mock
    private ItemRepository itemRepository;

    @Mock
    private ActivityLogService activityLogService;

    @InjectMocks
    private ItemService itemService;

    private Admin admin;

    @BeforeEach
    void setUp() {
        admin = Admin.builder()
                .id(1L)
                .adminName("Admin")
                .emailId("admin@ficcado.com")
                .role(AdminRole.ADMIN)
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("updateItem should preserve existing ItemSize entities and avoid recreating them")
    void updateItem_preservesExistingSizesWithoutRecreating() {
        Item existingItem = Item.builder()
                .id(1L)
                .itemName("ETERNITY - WHITE")
                .itemType("T-Shirt")
                .priceOfItem(new BigDecimal("350.00"))
                .costPrice(new BigDecimal("250.00"))
                .currentStatus(ItemStatus.ACTIVE)
                .sizes(new ArrayList<>())
                .build();

        ItemSize sizeXS = ItemSize.builder().id(101L).item(existingItem).size("XS").build();
        ItemSize sizeS = ItemSize.builder().id(102L).item(existingItem).size("S").build();
        ItemSize sizeM = ItemSize.builder().id(103L).item(existingItem).size("M").build();
        ItemSize sizeL = ItemSize.builder().id(104L).item(existingItem).size("L").build();
        ItemSize sizeXL = ItemSize.builder().id(105L).item(existingItem).size("XL").build();

        existingItem.getSizes().addAll(List.of(sizeXS, sizeS, sizeM, sizeL, sizeXL));

        when(itemRepository.findById(1L)).thenReturn(Optional.of(existingItem));
        when(itemRepository.save(any(Item.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Update with the exact same 5 sizes
        Optional<Item> result = itemService.updateItem(
                1L, "ETERNITY - WHITE", "T-Shirt",
                new BigDecimal("350.00"), new BigDecimal("250.00"),
                List.of("XS", "S", "M", "L", "XL"),
                ItemStatus.ACTIVE, admin
        );

        assertTrue(result.isPresent());
        Item updated = result.get();
        assertEquals(5, updated.getSizes().size());

        // Verify the original entity instances were retained (ids preserved, not recreated as transients)
        assertEquals(101L, updated.getSizes().get(0).getId());
        assertEquals(102L, updated.getSizes().get(1).getId());
        assertEquals(103L, updated.getSizes().get(2).getId());
        assertEquals(104L, updated.getSizes().get(3).getId());
        assertEquals(105L, updated.getSizes().get(4).getId());
    }

    @Test
    @DisplayName("updateItem should cleanly diff sizes: delete removed, retain existing, add new")
    void updateItem_diffsSizesCleanly() {
        Item existingItem = Item.builder()
                .id(1L)
                .itemName("ETERNITY - WHITE")
                .itemType("T-Shirt")
                .priceOfItem(new BigDecimal("350.00"))
                .costPrice(new BigDecimal("250.00"))
                .currentStatus(ItemStatus.ACTIVE)
                .sizes(new ArrayList<>())
                .build();

        ItemSize sizeS = ItemSize.builder().id(102L).item(existingItem).size("S").build();
        ItemSize sizeM = ItemSize.builder().id(103L).item(existingItem).size("M").build();
        existingItem.getSizes().addAll(List.of(sizeS, sizeM));

        when(itemRepository.findById(1L)).thenReturn(Optional.of(existingItem));
        when(itemRepository.save(any(Item.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Update removing 'S', keeping 'M', adding 'XXL'
        Optional<Item> result = itemService.updateItem(
                1L, "ETERNITY - WHITE", "T-Shirt",
                new BigDecimal("350.00"), new BigDecimal("250.00"),
                List.of("M", "XXL"),
                ItemStatus.ACTIVE, admin
        );

        assertTrue(result.isPresent());
        Item updated = result.get();
        assertEquals(2, updated.getSizes().size());

        // 'M' retained with id 103
        ItemSize retainedM = updated.getSizes().stream()
                .filter(s -> "M".equals(s.getSize()))
                .findFirst().orElseThrow();
        assertEquals(103L, retainedM.getId());

        // 'XXL' newly added (id is null until DB generation)
        ItemSize newXXL = updated.getSizes().stream()
                .filter(s -> "XXL".equals(s.getSize()))
                .findFirst().orElseThrow();
        assertNull(newXXL.getId());
        assertEquals(existingItem, newXXL.getItem());

        // 'S' removed
        assertFalse(updated.getSizes().stream().anyMatch(s -> "S".equals(s.getSize())));
    }

    @Test
    @DisplayName("createItem should deduplicate sizes passed in request")
    void createItem_deduplicatesSizes() {
        when(itemRepository.save(any(Item.class))).thenAnswer(invocation -> {
            Item it = invocation.getArgument(0);
            it.setId(10L);
            return it;
        });

        Item created = itemService.createItem(
                "TEE - BLACK", "T-Shirt",
                new BigDecimal("499.00"), new BigDecimal("299.00"),
                List.of("M", "L", "M", "  L  ", "XL"),
                admin
        );

        assertNotNull(created);
        assertEquals(3, created.getSizes().size());
        List<String> sizeNames = created.getSizes().stream().map(ItemSize::getSize).toList();
        assertTrue(sizeNames.containsAll(List.of("M", "L", "XL")));
        assertEquals(ItemStatus.ACTIVE, created.getCurrentStatus());
    }

    @Test
    @DisplayName("createItem should set explicit status when provided")
    void createItem_withExplicitStatus() {
        when(itemRepository.save(any(Item.class))).thenAnswer(invocation -> {
            Item it = invocation.getArgument(0);
            it.setId(11L);
            return it;
        });

        Item created = itemService.createItem(
                "TEE - VINTAGE", "T-Shirt",
                new BigDecimal("599.00"), new BigDecimal("349.00"),
                List.of("L"),
                ItemStatus.OUT_OF_STOCK,
                admin
        );

        assertNotNull(created);
        assertEquals(ItemStatus.OUT_OF_STOCK, created.getCurrentStatus());
    }
}
