package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.service.PublicProductService;
import com.aps.ficcado_crm_backend.service.ReviewService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verification of narrowed public security rules per ADD-2 in Part2_Addendum.md.
 * Ensures that only read-only GET requests on products and categories, and explicit
 * review endpoints are publicly accessible, rejecting all unauthenticated mutations
 * or arbitrary /api/public/** endpoints.
 */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityRulesTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PublicProductService publicProductService;

    @MockBean
    private ReviewService reviewService;

    @Test
    @DisplayName("Unauthenticated GET on /api/public/products succeeds (200)")
    void publicProductsGet_isAllowed() throws Exception {
        when(publicProductService.getAllPublicProducts(any(), anyBoolean(), any()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/public/products"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Unauthenticated GET on /api/public/categories succeeds (200)")
    void publicCategoriesGet_isAllowed() throws Exception {
        when(publicProductService.getPublicCategories())
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/public/categories"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Unauthenticated POST on /api/public/products is rejected (401 or 403)")
    void publicProductsPost_isRejected() throws Exception {
        mockMvc.perform(post("/api/public/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"test\"}"))
                .andExpect(status().is4xxClientError())
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(s == 401 || s == 403,
                            "Expected 401 Unauthorized or 403 Forbidden but got " + s);
                });
    }

    @Test
    @DisplayName("Unauthenticated PUT on /api/public/products/1 is rejected (401 or 403)")
    void publicProductsPut_isRejected() throws Exception {
        mockMvc.perform(put("/api/public/products/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"test\"}"))
                .andExpect(status().is4xxClientError())
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(s == 401 || s == 403,
                            "Expected 401 Unauthorized or 403 Forbidden but got " + s);
                });
    }

    @Test
    @DisplayName("Unauthenticated DELETE on /api/public/products/1 is rejected (401 or 403)")
    void publicProductsDelete_isRejected() throws Exception {
        mockMvc.perform(delete("/api/public/products/1"))
                .andExpect(status().is4xxClientError())
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(s == 401 || s == 403,
                            "Expected 401 Unauthorized or 403 Forbidden but got " + s);
                });
    }

    @Test
    @DisplayName("Unauthenticated PATCH on /api/public/products/1 is rejected (401 or 403)")
    void publicProductsPatch_isRejected() throws Exception {
        mockMvc.perform(patch("/api/public/products/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"test\"}"))
                .andExpect(status().is4xxClientError())
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(s == 401 || s == 403,
                            "Expected 401 Unauthorized or 403 Forbidden but got " + s);
                });
    }

    @Test
    @DisplayName("Unauthenticated invented path /api/public/anything is rejected (401 or 403)")
    void inventedPublicPath_isRejected() throws Exception {
        mockMvc.perform(get("/api/public/anything"))
                .andExpect(status().is4xxClientError())
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(s == 401 || s == 403,
                            "Expected 401 Unauthorized or 403 Forbidden but got " + s);
                });
    }

    @Test
    @DisplayName("Reviews validate endpoint allows unauthenticated access (returns 410 for invalid token, not 401/403)")
    void reviewsValidate_isAllowed() throws Exception {
        when(reviewService.validateToken("invalid-token")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/public/reviews/validate/invalid-token"))
                .andExpect(status().isGone()); // 410 Gone from controller, proving endpoint is reached without auth block
    }
}
