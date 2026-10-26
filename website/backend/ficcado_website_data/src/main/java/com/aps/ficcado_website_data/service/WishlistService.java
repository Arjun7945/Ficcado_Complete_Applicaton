package com.aps.ficcado_website_data.service;

import com.aps.ficcado_website_data.dto.WishlistDto.WishlistItemResponse;
import com.aps.ficcado_website_data.entity.WishlistItem;
import com.aps.ficcado_website_data.exception.WishlistLimitExceededException;
import com.aps.ficcado_website_data.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WishlistService {

    public static final int MAX_WISHLIST_ITEMS = 200;

    private final WishlistRepository wishlistRepository;

    /**
     * Lists all wishlist items for an authenticated customer.
     */
    @Transactional(readOnly = true)
    public List<WishlistItemResponse> getWishlist(Long customerId) {
        log.debug("Fetching wishlist for customerId={}", customerId);
        return wishlistRepository.findByCustomerIdOrderByCreatedAtDesc(customerId)
                .stream()
                .map(item -> new WishlistItemResponse(item.getItemId(), item.getCreatedAt()))
                .toList();
    }

    /**
     * Idempotently adds an item to customer's wishlist.
     * Enforces the maximum 200 items cap.
     */
    public WishlistItemResponse addToWishlist(Long customerId, Long itemId) {
        if (customerId == null || itemId == null) {
            throw new IllegalArgumentException("Customer ID and Item ID must not be null");
        }

        log.debug("Adding item to wishlist [customerId={}, itemId={}]", customerId, itemId);

        // Check if already in wishlist (idempotent)
        var existing = wishlistRepository.findByCustomerIdAndItemId(customerId, itemId);
        if (existing.isPresent()) {
            return new WishlistItemResponse(existing.get().getItemId(), existing.get().getCreatedAt());
        }

        // Check capacity limit
        long currentCount = wishlistRepository.countByCustomerId(customerId);
        if (currentCount >= MAX_WISHLIST_ITEMS) {
            log.warn("Customer {} reached maximum wishlist capacity of {} items", customerId, MAX_WISHLIST_ITEMS);
            throw new WishlistLimitExceededException("Wishlist limit reached. Maximum allowed is " + MAX_WISHLIST_ITEMS + " items.");
        }

        try {
            WishlistItem newItem = WishlistItem.builder()
                    .customerId(customerId)
                    .itemId(itemId)
                    .createdAt(Instant.now())
                    .build();
            WishlistItem saved = wishlistRepository.saveAndFlush(newItem);
            return new WishlistItemResponse(saved.getItemId(), saved.getCreatedAt());
        } catch (DataIntegrityViolationException e) {
            log.info("Concurrent add detected for customerId={}, itemId={}. Fetching existing item.", customerId, itemId);
            return wishlistRepository.findByCustomerIdAndItemId(customerId, itemId)
                    .map(item -> new WishlistItemResponse(item.getItemId(), item.getCreatedAt()))
                    .orElseGet(() -> new WishlistItemResponse(itemId, Instant.now()));
        }
    }

    /**
     * Idempotently removes an item from customer's wishlist.
     */
    @Transactional
    public void removeFromWishlist(Long customerId, Long itemId) {
        if (customerId == null || itemId == null) {
            return;
        }

        log.debug("Removing item from wishlist [customerId={}, itemId={}]", customerId, itemId);
        wishlistRepository.deleteByCustomerIdAndItemId(customerId, itemId);
    }
}
