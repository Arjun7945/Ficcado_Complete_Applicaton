package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.controller.InternalCustomerController;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerAuthResponse;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerProfileResponse;
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

import java.util.Collections;
import java.util.Map;

import static org.mockito.Mockito.*;
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
    @DisplayName("Internal OTP login handshake succeeds with valid X-Internal-Secret")
    void internalOtpLogin_validSecret_success() throws Exception {
        CustomerProfileResponse profile = new CustomerProfileResponse(
                1L, "Jane Doe", "jane@example.com", "9876543210", true, false, 0, Collections.emptyList()
        );
        CustomerAuthResponse response = new CustomerAuthResponse(
                true, "Authentication successful", "customer.jwt.handshake", profile
        );

        when(customerAuthService.authenticateViaVerifiedOtp("jane@example.com", "9876543210", "Jane Doe"))
                .thenReturn(response);

        Map<String, String> body = Map.of(
                "email", "jane@example.com",
                "phone", "9876543210",
                "name", "Jane Doe"
        );

        mockMvc.perform(post("/api/internal/customer/otp-login")
                        .header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.token").value("customer.jwt.handshake"));
    }

    @Test
    @DisplayName("Internal OTP login handshake rejected with 403 when secret is missing or invalid")
    void internalOtpLogin_invalidSecret_forbidden() throws Exception {
        Map<String, String> body = Map.of("email", "jane@example.com");

        mockMvc.perform(post("/api/internal/customer/otp-login")
                        .header("X-Internal-Secret", "wrong-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }
}
