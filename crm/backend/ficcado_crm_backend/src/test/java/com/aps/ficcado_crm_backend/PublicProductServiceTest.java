package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.dto.PublicProductDto.PublicCategoryResponse;
import com.aps.ficcado_crm_backend.dto.PublicProductDto.PublicProductResponse;
import com.aps.ficcado_crm_backend.dto.PublicProductDto.PublicReviewResponse;
import com.aps.ficcado_crm_backend.entity.*;
import com.aps.ficcado_crm_backend.entity.enums.ItemStatus;
import com.aps.ficcado_crm_backend.repository.InventoryRepository;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.service.PublicProductService;
import com.aps.ficcado_crm_backend.service.ReviewService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PublicProductServiceTest {

    @Mock
    private ItemRepository itemRepository;

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private ReviewService reviewService;

    @InjectMocks
    private PublicProductService publicProductService;

    private Item item1;
    private Item item2;

    @BeforeEach
    void setUp() {
        item1 = Item.builder()
                .id(1L)
                .itemName("CHOSEN")
                .itemType("T-Shirts")
                .priceOfItem(new BigDecimal("699.00"))
                .costPrice(new BigDecimal("250.00")) // Sensitive
                .currentStatus(ItemStatus.ACTIVE)
                .averageRating(new BigDecimal("4.90"))
                .reviewCount(27)
                .sizes(new ArrayList<>())
                .images(new ArrayList<>())
                .build();

        item1.getSizes().add(ItemSize.builder().id(10L).item(item1).size("M").build());
        item1.getSizes().add(ItemSize.builder().id(11L).item(item1).size("L").build());

        item2 = Item.builder()
                .id(2L)
                .itemName("GROUNDED")
                .itemType("T-Shirts")
                .priceOfItem(new BigDecimal("799.00"))
                .costPrice(new BigDecimal("300.00"))
                .currentStatus(ItemStatus.ACTIVE)
                .averageRating(new BigDecimal("4.80"))
                .reviewCount(25)
                .sizes(new ArrayList<>())
                .images(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("getAllPublicProducts should sanitize and redact costPrice and supplier details")
    void getAllPublicProducts_sanitizesSensitiveFields() {
        when(itemRepository.findActiveItemsWithSizes()).thenReturn(List.of(item1, item2));
        when(inventoryRepository.findByItemId(1L)).thenReturn(List.of(
                Inventory.builder().id(100L).item(item1).size("M").totalQuantity(5).build(),
                Inventory.builder().id(101L).item(item1).size("L").totalQuantity(0).build()
        ));
        when(inventoryRepository.findByItemId(2L)).thenReturn(List.of(
                Inventory.builder().id(102L).item(item2).size("M").totalQuantity(0).build()
        ));

        List<PublicProductResponse> result = publicProductService.getAllPublicProducts(null, true, null);

        assertThat(result).hasSize(2);
        PublicProductResponse p1 = result.get(0);
        assertThat(p1.id()).isEqualTo(1L);
        assertThat(p1.name()).isEqualTo("CHOSEN");
        assertThat(p1.slug()).isEqualTo("chosen");
        assertThat(p1.category()).isEqualTo("t-shirts");
        assertThat(p1.price()).isEqualByComparingTo("699.00");
        assertThat(p1.inStock()).isTrue(); // Has size M with qty 5
        assertThat(p1.sizeStock()).containsEntry("M", true);
        assertThat(p1.sizeStock()).containsEntry("L", false);

        // Verify class does NOT contain any cost price getter
        assertThat(PublicProductResponse.class.getDeclaredMethods())
                .noneMatch(m -> m.getName().toLowerCase().contains("cost"));
    }

    @Test
    @DisplayName("getAllPublicProducts with out of stock filter excludes out of stock items")
    void getAllPublicProducts_filtersOutOfStock() {
        when(itemRepository.findActiveItemsWithSizes()).thenReturn(List.of(item1, item2));
        when(inventoryRepository.findByItemId(1L)).thenReturn(List.of(
                Inventory.builder().id(100L).item(item1).size("M").totalQuantity(3).build()
        ));
        when(inventoryRepository.findByItemId(2L)).thenReturn(List.of(
                Inventory.builder().id(102L).item(item2).size("M").totalQuantity(0).build()
        ));

        List<PublicProductResponse> inStockOnly = publicProductService.getAllPublicProducts(null, false, null);

        assertThat(inStockOnly).hasSize(1);
        assertThat(inStockOnly.get(0).name()).isEqualTo("CHOSEN");
    }

    @Test
    @DisplayName("getPublicProductBySlug finds product by normalized slug")
    void getPublicProductBySlug_matchesNormalizedSlug() {
        when(itemRepository.findActiveItemsWithSizes()).thenReturn(List.of(item1));
        when(inventoryRepository.findByItemId(1L)).thenReturn(List.of());

        Optional<PublicProductResponse> found = publicProductService.getPublicProductBySlug("chosen");

        assertThat(found).isPresent();
        assertThat(found.get().slug()).isEqualTo("chosen");
        assertThat(found.get().name()).isEqualTo("CHOSEN");
    }

    @Test
    @DisplayName("getPublicCategories returns all official categories with counts")
    void getPublicCategories_returnsCategoriesWithCounts() {
        when(itemRepository.findActiveItemsWithSizes()).thenReturn(List.of(item1, item2));

        List<PublicCategoryResponse> categories = publicProductService.getPublicCategories();

        assertThat(categories).hasSize(6);
        PublicCategoryResponse tshirts = categories.stream()
                .filter(c -> c.slug().equals("t-shirts"))
                .findFirst().orElseThrow();
        assertThat(tshirts.productCount()).isEqualTo(2L);
        assertThat(tshirts.status()).isEqualTo("live");
    }

    @Test
    @DisplayName("getPublicReviewsForItem returns anonymized customer reviews")
    void getPublicReviewsForItem_anonymizesReviews() {
        Customer customer = Customer.builder()
                .id(50L)
                .customerName("Jane Doe")
                .emailId("jane@example.com")
                .build();

        SaleLineItem lineItem = SaleLineItem.builder()
                .id(200L)
                .size("M")
                .build();

        Review review = Review.builder()
                .id(300L)
                .item(item1)
                .customer(customer)
                .saleLineItem(lineItem)
                .starRating(5)
                .comment("Excellent quality!")
                .submittedAt(Instant.now())
                .build();

        when(reviewService.getReviewsForItem(1L)).thenReturn(List.of(review));

        List<PublicReviewResponse> reviews = publicProductService.getPublicReviewsForItem(1L);

        assertThat(reviews).hasSize(1);
        PublicReviewResponse r = reviews.get(0);
        assertThat(r.author()).isEqualTo("Jane D.");
        assertThat(r.rating()).isEqualTo(5);
        assertThat(r.comment()).isEqualTo("Excellent quality!");
        assertThat(r.sizeBought()).isEqualTo("M");
        assertThat(r.verified()).isTrue();
    }
}
