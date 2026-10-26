package com.aps.ficcado_website_data.controller;

import com.aps.ficcado_website_data.dto.WishlistDto.WishlistItemResponse;
import com.aps.ficcado_website_data.exception.GlobalExceptionHandler;
import com.aps.ficcado_website_data.exception.WishlistLimitExceededException;
import com.aps.ficcado_website_data.service.WishlistService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class WishlistControllerTest {

    private MockMvc mockMvc;

    @Mock
    private WishlistService wishlistService;

    @InjectMocks
    private WishlistController wishlistController;

    private final String VALID_SECRET = "ficcado-gateway-internal-secret-2026";
    private final String CUSTOMER_ID = "101";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(wishlistController, "gatewaySharedSecret", VALID_SECRET);
        mockMvc = MockMvcBuilders.standaloneSetup(wishlistController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/wishlist with valid gateway identity returns 200 with items")
    void getWishlist_authenticatedSuccess() throws Exception {
        when(wishlistService.getWishlist(101L))
                .thenReturn(List.of(new WishlistItemResponse(1L, Instant.now())));

        mockMvc.perform(get("/api/wishlist")
                        .header("X-Customer-Id", CUSTOMER_ID)
                        .header("X-Gateway-Secret", VALID_SECRET)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].itemId").value(1));

        verify(wishlistService).getWishlist(101L);
    }

    @Test
    @DisplayName("PUT /api/wishlist/{itemId} with valid gateway identity returns 200")
    void addToWishlist_authenticatedSuccess() throws Exception {
        when(wishlistService.addToWishlist(101L, 5L))
                .thenReturn(new WishlistItemResponse(5L, Instant.now()));

        mockMvc.perform(put("/api/wishlist/5")
                        .header("X-Customer-Id", CUSTOMER_ID)
                        .header("X-Gateway-Secret", VALID_SECRET)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemId").value(5));

        verify(wishlistService).addToWishlist(101L, 5L);
    }

    @Test
    @DisplayName("DELETE /api/wishlist/{itemId} with valid gateway identity returns 204 No Content")
    void removeFromWishlist_authenticatedSuccess() throws Exception {
        doNothing().when(wishlistService).removeFromWishlist(101L, 5L);

        mockMvc.perform(delete("/api/wishlist/5")
                        .header("X-Customer-Id", CUSTOMER_ID)
                        .header("X-Gateway-Secret", VALID_SECRET))
                .andExpect(status().isNoContent());

        verify(wishlistService).removeFromWishlist(101L, 5L);
    }

    @Test
    @DisplayName("Request without X-Gateway-Secret is rejected with 401 Unauthorized")
    void missingGatewaySecret_rejected() throws Exception {
        mockMvc.perform(get("/api/wishlist")
                        .header("X-Customer-Id", CUSTOMER_ID))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));

        verifyNoInteractions(wishlistService);
    }

    @Test
    @DisplayName("Request with invalid X-Gateway-Secret is rejected with 401 Unauthorized")
    void mismatchedGatewaySecret_rejected() throws Exception {
        mockMvc.perform(get("/api/wishlist")
                        .header("X-Customer-Id", CUSTOMER_ID)
                        .header("X-Gateway-Secret", "wrong-secret"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));

        verifyNoInteractions(wishlistService);
    }

    @Test
    @DisplayName("Request without X-Customer-Id is rejected with 401 Unauthorized")
    void missingCustomerId_rejected() throws Exception {
        mockMvc.perform(get("/api/wishlist")
                        .header("X-Gateway-Secret", VALID_SECRET))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));

        verifyNoInteractions(wishlistService);
    }

    @Test
    @DisplayName("Request with malformed X-Customer-Id is rejected with 401 Unauthorized")
    void malformedCustomerId_rejected() throws Exception {
        mockMvc.perform(get("/api/wishlist")
                        .header("X-Customer-Id", "not-a-number")
                        .header("X-Gateway-Secret", VALID_SECRET))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));

        verifyNoInteractions(wishlistService);
    }

    @Test
    @DisplayName("PUT /api/wishlist/{itemId} returns 400 when capacity limit exceeded")
    void addToWishlist_limitExceeded_returnsBadRequest() throws Exception {
        when(wishlistService.addToWishlist(101L, 5L))
                .thenThrow(new WishlistLimitExceededException("Wishlist limit reached. Maximum allowed is 200 items."));

        mockMvc.perform(put("/api/wishlist/5")
                        .header("X-Customer-Id", CUSTOMER_ID)
                        .header("X-Gateway-Secret", VALID_SECRET))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Wishlist limit reached. Maximum allowed is 200 items."));
    }

    @Test
    @DisplayName("Client customer ID in query param is strictly ignored in favor of header")
    void clientCustomerIdInQuery_ignored() throws Exception {
        when(wishlistService.getWishlist(101L))
                .thenReturn(List.of(new WishlistItemResponse(1L, Instant.now())));

        mockMvc.perform(get("/api/wishlist?customerId=999")
                        .header("X-Customer-Id", "101")
                        .header("X-Gateway-Secret", VALID_SECRET))
                .andExpect(status().isOk());

        verify(wishlistService).getWishlist(101L);
        verify(wishlistService, never()).getWishlist(999L);
    }
}
