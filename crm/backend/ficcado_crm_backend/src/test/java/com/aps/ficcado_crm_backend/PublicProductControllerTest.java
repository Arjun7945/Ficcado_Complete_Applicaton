package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.controller.PublicProductController;
import com.aps.ficcado_crm_backend.dto.PublicProductDto.PublicCategoryResponse;
import com.aps.ficcado_crm_backend.dto.PublicProductDto.PublicProductResponse;
import com.aps.ficcado_crm_backend.dto.PublicProductDto.PublicReviewResponse;
import com.aps.ficcado_crm_backend.service.PublicProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class PublicProductControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PublicProductService publicProductService;

    @InjectMocks
    private PublicProductController publicProductController;

    private PublicProductResponse sampleProduct;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(publicProductController).build();

        sampleProduct = new PublicProductResponse(
                1L,
                "CHOSEN",
                "chosen",
                "T-Shirts",
                "t-shirts",
                new BigDecimal("699.00"),
                new BigDecimal("4.90"),
                27,
                List.of("XS", "S", "M", "L", "XL"),
                Map.of("XS", true, "S", true, "M", true, "L", false, "XL", false),
                List.of("#DC2626"),
                "Different by choice not by chance.",
                "Different by choice not by chance.",
                "/images/items/chosen/red-image-1.jpg",
                "/images/items/chosen/red-image-2.jpg",
                List.of("/images/items/chosen/red-image-1.jpg", "/images/items/chosen/red-image-2.jpg"),
                true,
                true,
                true,
                1
        );
    }

    @Test
    @DisplayName("GET /api/public/products returns 200 with list of products")
    void getProducts_returnsSuccessList() throws Exception {
        when(publicProductService.getAllPublicProducts(null, false, null))
                .thenReturn(List.of(sampleProduct));

        mockMvc.perform(get("/api/public/products")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].name").value("CHOSEN"))
                .andExpect(jsonPath("$.data[0].slug").value("chosen"))
                .andExpect(jsonPath("$.data[0].category").value("t-shirts"))
                .andExpect(jsonPath("$.data[0].price").value(699.00))
                .andExpect(jsonPath("$.data[0].inStock").value(true))
                .andExpect(jsonPath("$.data[0].sizeStock.M").value(true))
                .andExpect(jsonPath("$.data[0].sizeStock.L").value(false));
    }

    @Test
    @DisplayName("GET /api/public/products/{id} returns 200 when product exists")
    void getProductById_returnsSuccess() throws Exception {
        when(publicProductService.getPublicProductById(1L))
                .thenReturn(Optional.of(sampleProduct));

        mockMvc.perform(get("/api/public/products/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("CHOSEN"));
    }

    @Test
    @DisplayName("GET /api/public/products/{id} returns 404 when product not found")
    void getProductById_returns404() throws Exception {
        when(publicProductService.getPublicProductById(999L))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/public/products/999")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/public/products/by-slug/{slug} returns 200 when found")
    void getProductBySlug_returnsSuccess() throws Exception {
        when(publicProductService.getPublicProductBySlug("chosen"))
                .thenReturn(Optional.of(sampleProduct));

        mockMvc.perform(get("/api/public/products/by-slug/chosen")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.slug").value("chosen"));
    }

    @Test
    @DisplayName("GET /api/public/products/{id}/reviews returns list of reviews")
    void getProductReviews_returnsReviews() throws Exception {
        PublicReviewResponse review = new PublicReviewResponse(
                "rev-1",
                1L,
                "John D.",
                5,
                "2026-10-20T00:00:00Z",
                "Verified Purchase",
                "Amazing fabric!",
                true,
                "M"
        );

        when(publicProductService.getPublicReviewsForItem(1L))
                .thenReturn(List.of(review));

        mockMvc.perform(get("/api/public/products/1/reviews")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].author").value("John D."))
                .andExpect(jsonPath("$.data[0].rating").value(5))
                .andExpect(jsonPath("$.data[0].verified").value(true));
    }

    @Test
    @DisplayName("GET /api/public/categories returns categories with 200")
    void getCategories_returnsCategories() throws Exception {
        PublicCategoryResponse category = new PublicCategoryResponse(
                "t-shirts",
                "T-Shirts",
                "t-shirts",
                "/images/categories/t-shirts.jpg",
                "live",
                "High quality 240gsm tees",
                1,
                5L
        );

        when(publicProductService.getPublicCategories())
                .thenReturn(List.of(category));

        mockMvc.perform(get("/api/public/categories")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].slug").value("t-shirts"))
                .andExpect(jsonPath("$.data[0].productCount").value(5));
    }

    @Test
    @DisplayName("GET /api/public/products/by-ids returns batch products with 200")
    void getProductsByIds_returnsBatchSuccess() throws Exception {
        when(publicProductService.getPublicProductsByIds(List.of(1L, 2L)))
                .thenReturn(List.of(sampleProduct));

        mockMvc.perform(get("/api/public/products/by-ids?ids=1,2")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].name").value("CHOSEN"));
    }
}
