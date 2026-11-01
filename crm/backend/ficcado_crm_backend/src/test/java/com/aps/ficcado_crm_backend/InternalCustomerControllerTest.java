package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.controller.InternalCustomerController;
import com.aps.ficcado_crm_backend.controller.InternalCustomerController.InternalResetPasswordRequest;
import com.aps.ficcado_crm_backend.service.CustomerAuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class InternalCustomerControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private CustomerAuthService customerAuthService;

    @InjectMocks
    private InternalCustomerController internalCustomerController;

    private static final String SECRET = "ficcado-internal-service-secret-key-change-in-prod";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(internalCustomerController, "internalApiKey", SECRET);
        mockMvc = MockMvcBuilders.standaloneSetup(internalCustomerController).build();
    }

    @Test
    @DisplayName("Internal checkCustomerExists returns exists true with valid X-Internal-Secret")
    void checkCustomerExists_validSecret_returnsExists() throws Exception {
        when(customerAuthService.customerExists("jane@example.com")).thenReturn(true);

        mockMvc.perform(get("/api/internal/customer/exists")
                        .header("X-Internal-Secret", SECRET)
                        .param("email", "jane@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists").value(true));
    }

    @Test
    @DisplayName("Internal checkCustomerExists rejected with 403 when secret is missing or invalid")
    void checkCustomerExists_invalidSecret_forbidden() throws Exception {
        mockMvc.perform(get("/api/internal/customer/exists")
                        .header("X-Internal-Secret", "wrong-secret")
                        .param("email", "jane@example.com"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Internal resetPassword succeeds with valid X-Internal-Secret")
    void resetPassword_validSecret_success() throws Exception {
        doNothing().when(customerAuthService).resetPassword("jane@example.com", "NewPass123!");

        InternalResetPasswordRequest body = new InternalResetPasswordRequest("jane@example.com", "NewPass123!");

        mockMvc.perform(post("/api/internal/customer/reset-password")
                        .header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Password updated successfully"));

        verify(customerAuthService, times(1)).resetPassword("jane@example.com", "NewPass123!");
    }

    @Test
    @DisplayName("Internal resetPassword returns 404 when customer not found")
    void resetPassword_customerNotFound_notFound() throws Exception {
        doThrow(new IllegalArgumentException("Customer not found"))
                .when(customerAuthService).resetPassword("unknown@example.com", "NewPass123!");

        InternalResetPasswordRequest body = new InternalResetPasswordRequest("unknown@example.com", "NewPass123!");

        mockMvc.perform(post("/api/internal/customer/reset-password")
                        .header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Customer not found"));
    }

    @Test
    @DisplayName("Internal resetPassword rejected with 403 when secret is missing or invalid")
    void resetPassword_invalidSecret_forbidden() throws Exception {
        InternalResetPasswordRequest body = new InternalResetPasswordRequest("jane@example.com", "NewPass123!");

        mockMvc.perform(post("/api/internal/customer/reset-password")
                        .header("X-Internal-Secret", "wrong-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }
}
