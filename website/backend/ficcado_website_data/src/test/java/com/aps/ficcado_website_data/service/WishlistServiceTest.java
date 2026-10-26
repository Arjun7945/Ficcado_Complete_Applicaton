package com.aps.ficcado_website_data.service;

import com.aps.ficcado_website_data.dto.WishlistDto.WishlistItemResponse;
import com.aps.ficcado_website_data.entity.WishlistItem;
import com.aps.ficcado_website_data.exception.WishlistLimitExceededException;
import com.aps.ficcado_website_data.repository.WishlistRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WishlistServiceTest {

    @Mock
    private WishlistRepository wishlistRepository;

    @InjectMocks
    private WishlistService wishlistService;

    private Long customerA = 101L;
    private Long customerB = 102L;
    private Long item1 = 1L;
    private Long item2 = 2L;

    @Test
    @DisplayName("getWishlist returns list of items for specified customer")
    void getWishlist_returnsCustomerItems() {
        WishlistItem item = WishlistItem.builder()
                .id(1L)
                .customerId(customerA)
                .itemId(item1)
                .createdAt(Instant.now())
                .build();

        when(wishlistRepository.findByCustomerIdOrderByCreatedAtDesc(customerA))
                .thenReturn(List.of(item));

        List<WishlistItemResponse> list = wishlistService.getWishlist(customerA);

        assertThat(list).hasSize(1);
        assertThat(list.get(0).itemId()).isEqualTo(item1);
        verify(wishlistRepository).findByCustomerIdOrderByCreatedAtDesc(customerA);
    }

    @Test
    @DisplayName("Customer A never sees Customer B's wishlist items")
    void customerIsolation_listDiffers() {
        WishlistItem itemA = WishlistItem.builder().id(1L).customerId(customerA).itemId(item1).createdAt(Instant.now()).build();
        WishlistItem itemB = WishlistItem.builder().id(2L).customerId(customerB).itemId(item2).createdAt(Instant.now()).build();

        when(wishlistRepository.findByCustomerIdOrderByCreatedAtDesc(customerA)).thenReturn(List.of(itemA));
        when(wishlistRepository.findByCustomerIdOrderByCreatedAtDesc(customerB)).thenReturn(List.of(itemB));

        List<WishlistItemResponse> listA = wishlistService.getWishlist(customerA);
        List<WishlistItemResponse> listB = wishlistService.getWishlist(customerB);

        assertThat(listA).extracting(WishlistItemResponse::itemId).containsExactly(item1);
        assertThat(listB).extracting(WishlistItemResponse::itemId).containsExactly(item2);
    }

    @Test
    @DisplayName("addToWishlist successfully saves new item when below limit")
    void addToWishlist_success() {
        WishlistItem created = WishlistItem.builder().id(10L).customerId(customerA).itemId(item1).createdAt(Instant.now()).build();
        when(wishlistRepository.findByCustomerIdAndItemId(customerA, item1)).thenReturn(Optional.empty());
        when(wishlistRepository.countByCustomerId(customerA)).thenReturn(5L);
        when(wishlistRepository.saveAndFlush(any(WishlistItem.class))).thenReturn(created);

        WishlistItemResponse res = wishlistService.addToWishlist(customerA, item1);

        assertThat(res.itemId()).isEqualTo(item1);
        assertThat(res.createdAt()).isNotNull();
        verify(wishlistRepository).saveAndFlush(any(WishlistItem.class));
    }

    @Test
    @DisplayName("addToWishlist twice is idempotent: returns existing item and creates only one row")
    void addToWishlist_twiceIsIdempotent() {
        WishlistItem existing = WishlistItem.builder()
                .id(1L)
                .customerId(customerA)
                .itemId(item1)
                .createdAt(Instant.now().minusSeconds(60))
                .build();

        when(wishlistRepository.findByCustomerIdAndItemId(customerA, item1)).thenReturn(Optional.of(existing));

        WishlistItemResponse res = wishlistService.addToWishlist(customerA, item1);

        assertThat(res.itemId()).isEqualTo(item1);
        assertThat(res.createdAt()).isEqualTo(existing.getCreatedAt());
        verify(wishlistRepository, never()).saveAndFlush(any(WishlistItem.class));
    }

    @Test
    @DisplayName("addToWishlist throws WishlistLimitExceededException when customer reaches 200 items")
    void addToWishlist_limitExceeded() {
        when(wishlistRepository.findByCustomerIdAndItemId(customerA, item1)).thenReturn(Optional.empty());
        when(wishlistRepository.countByCustomerId(customerA)).thenReturn(200L);

        assertThatThrownBy(() -> wishlistService.addToWishlist(customerA, item1))
                .isInstanceOf(WishlistLimitExceededException.class)
                .hasMessageContaining("200 items");

        verify(wishlistRepository, never()).saveAndFlush(any(WishlistItem.class));
    }

    @Test
    @DisplayName("addToWishlist handles concurrent duplicate add gracefully")
    void addToWishlist_concurrentDuplicateHandled() {
        WishlistItem existing = WishlistItem.builder().id(1L).customerId(customerA).itemId(item1).createdAt(Instant.now()).build();
        when(wishlistRepository.findByCustomerIdAndItemId(customerA, item1))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(existing));
        when(wishlistRepository.countByCustomerId(customerA)).thenReturn(10L);
        when(wishlistRepository.saveAndFlush(any(WishlistItem.class))).thenThrow(new DataIntegrityViolationException("unique constraint"));

        WishlistItemResponse res = wishlistService.addToWishlist(customerA, item1);

        assertThat(res.itemId()).isEqualTo(item1);
        verify(wishlistRepository).saveAndFlush(any(WishlistItem.class));
    }

    @Test
    @DisplayName("removeFromWishlist deletes item for authenticated customer")
    void removeFromWishlist_success() {
        wishlistService.removeFromWishlist(customerA, item1);
        verify(wishlistRepository).deleteByCustomerIdAndItemId(customerA, item1);
    }

    @Test
    @DisplayName("removeFromWishlist missing item succeeds silently")
    void removeFromWishlist_missingItemSucceeds() {
        doNothing().when(wishlistRepository).deleteByCustomerIdAndItemId(customerA, 999L);
        wishlistService.removeFromWishlist(customerA, 999L);
        verify(wishlistRepository).deleteByCustomerIdAndItemId(customerA, 999L);
    }

    @Test
    @DisplayName("Customer A deleting an item never deletes Customer B's item")
    void customerIsolation_deleteDoesNotAffectOtherCustomer() {
        wishlistService.removeFromWishlist(customerA, item1);
        verify(wishlistRepository).deleteByCustomerIdAndItemId(customerA, item1);
        verify(wishlistRepository, never()).deleteByCustomerIdAndItemId(eq(customerB), anyLong());
    }
}
