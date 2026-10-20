package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.controller.CustomerAuthController;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerAuthResponse;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerProfileResponse;
import com.aps.ficcado_crm_backend.entity.Customer;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CustomerAuthControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private CustomerAuthService customerAuthService;

    @InjectMocks
    private CustomerAuthController customerAuthController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(customerAuthController).build();
    }

    @Test
    @DisplayName("POST /api/customer/auth/register succeeds and sets cookie")
    void register_success() throws Exception {
        CustomerProfileResponse profile = new CustomerProfileResponse(
                1L, "Jane Doe", "jane@example.com", "9876543210", false, false, 0, Collections.emptyList()
        );
        CustomerAuthResponse response = new CustomerAuthResponse(
                true, "Registration successful", "mock.jwt.token", profile
        );

        when(customerAuthService.registerCustomer(any())).thenReturn(response);

        Map<String, String> body = Map.of(
                "name", "Jane Doe",
                "email", "jane@example.com",
                "phone", "9876543210",
                "password", "Secret123!"
        );

        mockMvc.perform(post("/api/customer/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(cookie().exists("ficcado_customer_session"))
                .andExpect(cookie().value("ficcado_customer_session", "mock.jwt.token"));
    }

    @Test
    @DisplayName("POST /api/customer/auth/login succeeds for valid credentials")
    void login_validCredentials_success() throws Exception {
        Customer customer = Customer.builder()
                .id(1L)
                .customerName("Jane Doe")
                .emailId("jane@example.com")
                .build();

        CustomerProfileResponse profile = new CustomerProfileResponse(
                1L, "Jane Doe", "jane@example.com", "9876543210", true, false, 0, Collections.emptyList()
        );

        when(customerAuthService.authenticate("jane@example.com", "Secret123!"))
                .thenReturn(Optional.of(customer));
        when(customerAuthService.generateCustomerToken(customer)).thenReturn("valid.customer.jwt");
        when(customerAuthService.mapToProfileResponse(customer)).thenReturn(profile);

        Map<String, String> body = Map.of(
                "email", "jane@example.com",
                "password", "Secret123!"
        );

        mockMvc.perform(post("/api/customer/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(cookie().exists("ficcado_customer_session"))
                .andExpect(cookie().value("ficcado_customer_session", "valid.customer.jwt"));
    }

    @Test
    @DisplayName("POST /api/customer/auth/login rejects invalid credentials with 401")
    void login_invalidCredentials_401() throws Exception {
        when(customerAuthService.authenticate("wrong@example.com", "wrongpass"))
                .thenReturn(Optional.empty());

        Map<String, String> body = Map.of(
                "email", "wrong@example.com",
                "password", "wrongpass"
        );

        mockMvc.perform(post("/api/customer/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }
}
