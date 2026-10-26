package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.dto.PublicProductDto.PublicProductResponse;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.enums.AdminRole;
import com.aps.ficcado_crm_backend.entity.enums.ItemStatus;
import com.aps.ficcado_crm_backend.exception.GlobalExceptionHandler;
import com.aps.ficcado_crm_backend.exception.ItemVersionConflictException;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.service.ActivityLogService;
import com.aps.ficcado_crm_backend.service.ItemService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ItemValidationAndLockingTest {

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

    @Nested
    @DisplayName("Color Validation Tests")
    class ColorValidationTests {

        @Test
        @DisplayName("Valid hex color codes in uppercase and lowercase are accepted and normalized")
        void validColors_acceptedAndNormalized() {
            when(itemRepository.save(any(Item.class))).thenAnswer(inv -> {
                Item it = inv.getArgument(0);
                it.setId(100L);
                return it;
            });

            Item item = itemService.createItem(
                    "SHIRT", "Shirts",
                    new BigDecimal("999.00"), new BigDecimal("499.00"),
                    List.of("M"),
                    ItemStatus.ACTIVE,
                    "Premium cotton shirt",
                    List.of("#1a2b3c", "#FFFFFF", "#000000"),
                    List.of("summer", "linen"),
                    admin
            );

            assertNotNull(item);
            assertEquals(3, item.getColors().size());
            assertEquals("#1A2B3C", item.getColors().get(0).getColorHex());
            assertEquals("#FFFFFF", item.getColors().get(1).getColorHex());
            assertEquals("#000000", item.getColors().get(2).getColorHex());
        }

        @Test
        @DisplayName("Invalid hex format throws IllegalArgumentException")
        void invalidHexFormat_throwsException() {
            assertThrows(IllegalArgumentException.class, () ->
                    itemService.createItem(
                            "SHIRT", "Shirts",
                            new BigDecimal("999.00"), new BigDecimal("499.00"),
                            List.of("M"),
                            ItemStatus.ACTIVE,
                            "Desc",
                            List.of("not-a-hex"),
                            List.of("tag"),
                            admin
                    )
            );

            assertThrows(IllegalArgumentException.class, () ->
                    itemService.createItem(
                            "SHIRT", "Shirts",
                            new BigDecimal("999.00"), new BigDecimal("499.00"),
                            List.of("M"),
                            ItemStatus.ACTIVE,
                            "Desc",
                            List.of("#FFF"), // Must be 6 hex digits
                            List.of("tag"),
                            admin
                    )
            );
        }

        @Test
        @DisplayName("More than 12 colors throws IllegalArgumentException")
        void moreThan12Colors_throwsException() {
            List<String> thirteenColors = List.of(
                    "#000001", "#000002", "#000003", "#000004", "#000005",
                    "#000006", "#000007", "#000008", "#000009", "#00000A",
                    "#00000B", "#00000C", "#00000D"
            );

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    itemService.createItem(
                            "SHIRT", "Shirts",
                            new BigDecimal("999.00"), new BigDecimal("499.00"),
                            List.of("M"),
                            ItemStatus.ACTIVE,
                            "Desc",
                            thirteenColors,
                            null,
                            admin
                    )
            );
            assertTrue(ex.getMessage().contains("Maximum 12"));
        }

        @Test
        @DisplayName("Duplicate colors throw IllegalArgumentException")
        void duplicateColors_throwsException() {
            List<String> dupes = List.of("#FF0000", "#ff0000");

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    itemService.createItem(
                            "SHIRT", "Shirts",
                            new BigDecimal("999.00"), new BigDecimal("499.00"),
                            List.of("M"),
                            ItemStatus.ACTIVE,
                            "Desc",
                            dupes,
                            null,
                            admin
                    )
            );
            assertTrue(ex.getMessage().contains("Duplicate color"));
        }
    }

    @Nested
    @DisplayName("Tag Validation Tests")
    class TagValidationTests {

        @Test
        @DisplayName("Valid tags are accepted and trimmed")
        void validTags_accepted() {
            when(itemRepository.save(any(Item.class))).thenAnswer(inv -> inv.getArgument(0));

            Item item = itemService.createItem(
                    "SHIRT", "Shirts",
                    new BigDecimal("999.00"), new BigDecimal("499.00"),
                    List.of("M"),
                    ItemStatus.ACTIVE,
                    "Desc",
                    null,
                    List.of("  casual  ", "summer-vibes"),
                    admin
            );

            assertEquals(2, item.getTags().size());
            assertEquals("casual", item.getTags().get(0).getTag());
            assertEquals("summer-vibes", item.getTags().get(1).getTag());
        }

        @Test
        @DisplayName("Tag with length < 2 or > 30 throws IllegalArgumentException")
        void invalidTagLength_throwsException() {
            // Less than 2
            assertThrows(IllegalArgumentException.class, () ->
                    itemService.createItem(
                            "SHIRT", "Shirts",
                            new BigDecimal("999.00"), new BigDecimal("499.00"),
                            List.of("M"),
                            ItemStatus.ACTIVE,
                            "Desc",
                            null,
                            List.of("a"),
                            admin
                    )
            );

            // Greater than 30
            String longTag = "a".repeat(31);
            assertThrows(IllegalArgumentException.class, () ->
                    itemService.createItem(
                            "SHIRT", "Shirts",
                            new BigDecimal("999.00"), new BigDecimal("499.00"),
                            List.of("M"),
                            ItemStatus.ACTIVE,
                            "Desc",
                            null,
                            List.of(longTag),
                            admin
                    )
            );
        }

        @Test
        @DisplayName("More than 10 tags throws IllegalArgumentException")
        void moreThan10Tags_throwsException() {
            List<String> elevenTags = List.of(
                    "t1", "t2", "t3", "t4", "t5",
                    "t6", "t7", "t8", "t9", "t10", "t11"
            );

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    itemService.createItem(
                            "SHIRT", "Shirts",
                            new BigDecimal("999.00"), new BigDecimal("499.00"),
                            List.of("M"),
                            ItemStatus.ACTIVE,
                            "Desc",
                            null,
                            elevenTags,
                            admin
                    )
            );
            assertTrue(ex.getMessage().contains("Maximum 10"));
        }

        @Test
        @DisplayName("Duplicate tags case-insensitively throw IllegalArgumentException")
        void duplicateTags_throwsException() {
            List<String> dupes = List.of("Streetwear", "streetwear");

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    itemService.createItem(
                            "SHIRT", "Shirts",
                            new BigDecimal("999.00"), new BigDecimal("499.00"),
                            List.of("M"),
                            ItemStatus.ACTIVE,
                            "Desc",
                            null,
                            dupes,
                            admin
                    )
            );
            assertTrue(ex.getMessage().contains("Duplicate tag"));
        }
    }

    @Nested
    @DisplayName("Description Validation Tests")
    class DescriptionValidationTests {

        @Test
        @DisplayName("Description up to 2000 chars is accepted")
        void validDescription_accepted() {
            when(itemRepository.save(any(Item.class))).thenAnswer(inv -> inv.getArgument(0));

            String desc = "A".repeat(2000);
            Item item = itemService.createItem(
                    "SHIRT", "Shirts",
                    new BigDecimal("999.00"), new BigDecimal("499.00"),
                    List.of("M"),
                    ItemStatus.ACTIVE,
                    desc,
                    null,
                    null,
                    admin
            );

            assertEquals(2000, item.getDescription().length());
        }

        @Test
        @DisplayName("Description exceeding 2000 chars throws IllegalArgumentException")
        void descriptionTooLong_throwsException() {
            String desc = "A".repeat(2001);
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    itemService.createItem(
                            "SHIRT", "Shirts",
                            new BigDecimal("999.00"), new BigDecimal("499.00"),
                            List.of("M"),
                            ItemStatus.ACTIVE,
                            desc,
                            null,
                            null,
                            admin
                    )
            );
            assertTrue(ex.getMessage().contains("2000 characters"));
        }
    }

    @Nested
    @DisplayName("AUD-09 Optimistic Locking Tests")
    class OptimisticLockingTests {

        private Item existingItem;

        @BeforeEach
        void initItem() {
            existingItem = Item.builder()
                    .id(50L)
                    .itemName("OVERSIZED HOODIE")
                    .itemType("Hoodie")
                    .priceOfItem(new BigDecimal("1299.00"))
                    .costPrice(new BigDecimal("600.00"))
                    .currentStatus(ItemStatus.ACTIVE)
                    .version(2L)
                    .sizes(new ArrayList<>())
                    .colors(new ArrayList<>())
                    .tags(new ArrayList<>())
                    .build();
        }

        @Test
        @DisplayName("Update with matching version succeeds")
        void updateItem_matchingVersion_succeeds() {
            when(itemRepository.findById(50L)).thenReturn(Optional.of(existingItem));
            when(itemRepository.save(any(Item.class))).thenAnswer(inv -> inv.getArgument(0));

            Optional<Item> updated = itemService.updateItem(
                    50L, "OVERSIZED HOODIE V2", "Hoodie",
                    new BigDecimal("1399.00"), new BigDecimal("650.00"),
                    List.of("L"),
                    ItemStatus.ACTIVE,
                    "Updated description",
                    List.of("#000000"),
                    List.of("winter"),
                    2L, // Matching version
                    admin
            );

            assertTrue(updated.isPresent());
            assertEquals("OVERSIZED HOODIE V2", updated.get().getItemName());
            assertEquals("Updated description", updated.get().getDescription());
            assertEquals(1, updated.get().getColors().size());
            assertEquals("#000000", updated.get().getColors().get(0).getColorHex());
            assertEquals(1, updated.get().getTags().size());
            assertEquals("winter", updated.get().getTags().get(0).getTag());
        }

        @Test
        @DisplayName("Update with mismatched version throws ItemVersionConflictException (409)")
        void updateItem_mismatchedVersion_throwsConflictException() {
            when(itemRepository.findById(50L)).thenReturn(Optional.of(existingItem));

            ItemVersionConflictException ex = assertThrows(ItemVersionConflictException.class, () ->
                    itemService.updateItem(
                            50L, "OVERSIZED HOODIE V2", "Hoodie",
                            new BigDecimal("1399.00"), new BigDecimal("650.00"),
                            List.of("L"),
                            ItemStatus.ACTIVE,
                            "Updated description",
                            null,
                            null,
                            1L, // Stale version (DB has 2L)
                            admin
                    )
            );

            assertEquals(1L, ex.getExpectedVersion());
            assertEquals(2L, ex.getActualVersion());
            assertEquals("This item was changed by another admin. Reload to see the latest version.", ex.getMessage());
        }

        @Test
        @DisplayName("Update with null version succeeds without conflict check (backward compatibility)")
        void updateItem_nullVersion_succeeds() {
            when(itemRepository.findById(50L)).thenReturn(Optional.of(existingItem));
            when(itemRepository.save(any(Item.class))).thenAnswer(inv -> inv.getArgument(0));

            Optional<Item> updated = itemService.updateItem(
                    50L, "OVERSIZED HOODIE V2", "Hoodie",
                    new BigDecimal("1399.00"), new BigDecimal("650.00"),
                    List.of("L"),
                    ItemStatus.ACTIVE,
                    "Updated description",
                    null,
                    null,
                    null, // Null version
                    admin
            );

            assertTrue(updated.isPresent());
            assertEquals("OVERSIZED HOODIE V2", updated.get().getItemName());
        }

        @Test
        @DisplayName("Concurrent update simulation: one succeeds and bumps version, other fails with 409 conflict")
        void concurrentUpdate_oneSucceedsOtherThrowsConflict() {
            when(itemRepository.findById(50L)).thenReturn(Optional.of(existingItem));
            when(itemRepository.save(any(Item.class))).thenAnswer(inv -> {
                Item it = inv.getArgument(0);
                // Simulate DB version increment on successful commit
                it.setVersion(it.getVersion() + 1);
                return it;
            });

            // Admin A reads version 2L and saves successfully -> version becomes 3L
            Optional<Item> savedA = itemService.updateItem(
                    50L, "HOODIE - ADMIN A", "Hoodie",
                    new BigDecimal("1399.00"), new BigDecimal("650.00"),
                    List.of("L"), ItemStatus.ACTIVE,
                    "Desc A", null, null, 2L, admin
            );
            assertTrue(savedA.isPresent());
            assertEquals(3L, existingItem.getVersion());

            // Admin B still holds stale version 2L and tries to update -> conflict!
            ItemVersionConflictException ex = assertThrows(ItemVersionConflictException.class, () ->
                    itemService.updateItem(
                            50L, "HOODIE - ADMIN B", "Hoodie",
                            new BigDecimal("1499.00"), new BigDecimal("700.00"),
                            List.of("L"), ItemStatus.ACTIVE,
                            "Desc B", null, null, 2L, admin
                    )
            );

            assertEquals(2L, ex.getExpectedVersion());
            assertEquals(3L, ex.getActualVersion());
        }
    }

    @Nested
    @DisplayName("AUD-09 GlobalExceptionHandler Mapping Tests")
    class ExceptionHandlerTests {

        private final GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler();

        @Test
        @DisplayName("ItemVersionConflictException maps to 409 Conflict with code ITEM_VERSION_CONFLICT")
        void handleItemVersionConflictException() {
            ItemVersionConflictException ex = new ItemVersionConflictException(1L, 2L);
            ProblemDetail pd = exceptionHandler.handleItemVersionConflict(ex);

            assertEquals(HttpStatus.CONFLICT.value(), pd.getStatus());
            assertEquals("This item was changed by another admin. Reload to see the latest version.", pd.getDetail());
            assertEquals("ITEM_VERSION_CONFLICT", pd.getProperties().get("code"));
            assertEquals(1L, pd.getProperties().get("expectedVersion"));
            assertEquals(2L, pd.getProperties().get("actualVersion"));
        }

        @Test
        @DisplayName("ObjectOptimisticLockingFailureException maps to 409 Conflict with code ITEM_VERSION_CONFLICT")
        void handleOptimisticLockingFailure() {
            ObjectOptimisticLockingFailureException ex = new ObjectOptimisticLockingFailureException(Item.class, 50L);
            ProblemDetail pd = exceptionHandler.handleObjectOptimisticLocking(ex);

            assertEquals(HttpStatus.CONFLICT.value(), pd.getStatus());
            assertEquals("This item was changed by another admin. Reload to see the latest version.", pd.getDetail());
            assertEquals("ITEM_VERSION_CONFLICT", pd.getProperties().get("code"));
        }
    }

    @Nested
    @DisplayName("AUD-09 Rule 5: Public DTO Safety Tests")
    class PublicDtoSafetyTests {

        @Test
        @DisplayName("PublicProductResponse never exposes entity version field")
        void publicProductResponse_doesNotExposeVersion() {
            assertThat(PublicProductResponse.class.getDeclaredMethods())
                    .noneMatch(m -> m.getName().toLowerCase().contains("version"));
        }

        @Test
        @DisplayName("PublicProductResponse includes plain-text description, colors, and tags")
        void publicProductResponse_containsNewFields() {
            PublicProductResponse response = new PublicProductResponse(
                    1L,
                    "CHOSEN",
                    "chosen",
                    "T-Shirts",
                    "t-shirts",
                    new BigDecimal("699.00"),
                    new BigDecimal("4.90"),
                    27,
                    List.of("M", "L"),
                    Map.of("M", true, "L", false),
                    List.of("#FF0000", "#000000"),
                    "Different by choice not by chance.",
                    "Plain text description with line breaks\nLine 2",
                    "/img1.jpg",
                    "/img2.jpg",
                    List.of("/img1.jpg", "/img2.jpg"),
                    true,
                    true,
                    true,
                    1,
                    List.of("streetwear", "oversized")
            );

            assertEquals(List.of("#FF0000", "#000000"), response.colors());
            assertEquals("Plain text description with line breaks\nLine 2", response.description());
            assertEquals(List.of("streetwear", "oversized"), response.tags());
        }
    }
}
