package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.controller.CustomerProfileController;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerAddressDto;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerProfileResponse;
import com.aps.ficcado_crm_backend.entity.Customer;
import com.aps.ficcado_crm_backend.entity.CustomerAddress;
import com.aps.ficcado_crm_backend.repository.CustomerRepository;
import com.aps.ficcado_crm_backend.service.CustomerAuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CustomerAddressTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private CustomerAuthService customerAuthService;

    @InjectMocks
    private CustomerProfileController customerProfileController;

    private Customer mockCustomer;

    @BeforeEach
    void setUp() {
        mockCustomer = Customer.builder()
                .id(101L)
                .customerName("Arjun Test")
                .emailId("arjun@ficcado.store")
                .phoneNumber("9876543210")
                .addresses(new ArrayList<>())
                .build();

        HandlerMethodArgumentResolver authPrincipalResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(AuthenticationPrincipal.class)
                        && parameter.getParameterType().equals(Customer.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                String unauth = webRequest.getHeader("X-Simulate-Unauth");
                if ("true".equalsIgnoreCase(unauth)) {
                    return null;
                }
                return mockCustomer;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(customerProfileController)
                .setCustomArgumentResolvers(authPrincipalResolver)
                .build();
    }

    @Test
    @DisplayName("GET /api/customer/profile/addresses returns saved addresses for customer")
    void getAddresses_returnsList() throws Exception {
        CustomerAddress addr = CustomerAddress.builder()
                .id(1L)
                .customer(mockCustomer)
                .address("Flat 4B, Emerald Heights, Marine Drive, Kochi 682031")
                .isDefault(true)
                .build();
        mockCustomer.getAddresses().add(addr);

        when(customerRepository.findById(101L)).thenReturn(Optional.of(mockCustomer));

        mockMvc.perform(get("/api/customer/profile/addresses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].address").value("Flat 4B, Emerald Heights, Marine Drive, Kochi 682031"))
                .andExpect(jsonPath("$[0].isDefault").value(true));
    }

    @Test
    @DisplayName("POST /api/customer/profile/addresses saves valid address")
    void addAddress_validSaves() throws Exception {
        when(customerRepository.findById(101L)).thenReturn(Optional.of(mockCustomer));
        when(customerRepository.save(any(Customer.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(customerAuthService.mapToProfileResponse(any(Customer.class)))
                .thenReturn(new CustomerProfileResponse(
                        101L, "Arjun Test", "arjun@ficcado.store", "9876543210", true, true, 0,
                        List.of(new CustomerAddressDto(1L, "Flat 4B, Marine Drive, Kochi", true))
                ));

        Map<String, Object> body = Map.of(
                "address", "Flat 4B, Marine Drive, Kochi 682031",
                "isDefault", true
        );

        mockMvc.perform(post("/api/customer/profile/addresses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(101));

        verify(customerRepository).save(mockCustomer);
    }

    @Test
    @DisplayName("POST /api/customer/profile/addresses rejects address with less than 5 characters")
    void addAddress_tooShortRejected() throws Exception {
        Map<String, Object> body = Map.of("address", "Apt");

        mockMvc.perform(post("/api/customer/profile/addresses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Address must be at least 5 characters"));

        verify(customerRepository, never()).save(any());
    }

    @Test
    @DisplayName("POST /api/customer/profile/addresses rejects address exceeding 500 characters")
    void addAddress_tooLongRejected() throws Exception {
        String longAddress = "X".repeat(501);
        Map<String, Object> body = Map.of("address", longAddress);

        mockMvc.perform(post("/api/customer/profile/addresses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Address cannot exceed 500 characters"));

        verify(customerRepository, never()).save(any());
    }

    @Test
    @DisplayName("POST /api/customer/profile/addresses rejects when 10 saved addresses cap is reached")
    void addAddress_maxLimitReached() throws Exception {
        for (int i = 1; i <= 10; i++) {
            mockCustomer.getAddresses().add(CustomerAddress.builder()
                    .id((long) i)
                    .customer(mockCustomer)
                    .address("Address Number " + i + ", City 123456")
                    .isDefault(i == 1)
                    .build());
        }

        when(customerRepository.findById(101L)).thenReturn(Optional.of(mockCustomer));

        Map<String, Object> body = Map.of("address", "Eleventh Address, Bangalore 560001");

        mockMvc.perform(post("/api/customer/profile/addresses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Maximum 10 saved addresses reached"));

        verify(customerRepository, never()).save(any());
    }

    @Test
    @DisplayName("DELETE /api/customer/profile/addresses/{id} deletes address belonging to customer")
    void deleteAddress_success() throws Exception {
        CustomerAddress addr = CustomerAddress.builder()
                .id(42L)
                .customer(mockCustomer)
                .address("Some Road, Calicut")
                .isDefault(true)
                .build();
        mockCustomer.getAddresses().add(addr);

        when(customerRepository.findById(101L)).thenReturn(Optional.of(mockCustomer));

        mockMvc.perform(delete("/api/customer/profile/addresses/42"))
                .andExpect(status().isNoContent());

        verify(customerRepository).save(mockCustomer);
    }

    @Test
    @DisplayName("DELETE /api/customer/profile/addresses/{id} returns 404 when address does not belong to customer")
    void deleteAddress_notFoundOrOtherCustomer() throws Exception {
        // Customer has no address with ID 999
        when(customerRepository.findById(101L)).thenReturn(Optional.of(mockCustomer));

        mockMvc.perform(delete("/api/customer/profile/addresses/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Address not found or does not belong to customer"));

        verify(customerRepository, never()).save(any());
    }

    @Test
    @DisplayName("Unauthenticated request returns 401 Unauthorized")
    void unauthenticatedReturns401() throws Exception {
        mockMvc.perform(get("/api/customer/profile/addresses")
                        .header("X-Simulate-Unauth", "true"))
                .andExpect(status().isUnauthorized());
    }
}
