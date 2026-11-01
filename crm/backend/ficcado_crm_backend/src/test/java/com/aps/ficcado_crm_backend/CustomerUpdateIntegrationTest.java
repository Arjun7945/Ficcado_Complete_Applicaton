package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.dto.CustomerDto.CustomerUpdateRequest;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Customer;
import com.aps.ficcado_crm_backend.entity.CustomerAddress;
import com.aps.ficcado_crm_backend.entity.enums.AdminRole;
import com.aps.ficcado_crm_backend.repository.AdminRepository;
import com.aps.ficcado_crm_backend.repository.CustomerRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CustomerUpdateIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AdminRepository adminRepository;

    private Admin adminUser;
    private UsernamePasswordAuthenticationToken adminAuth;
    private UsernamePasswordAuthenticationToken unprivilegedAuth;
    private Customer testCustomer1;
    private Customer testCustomer2;

    @BeforeEach
    void setUp() {
        adminUser = adminRepository.findByEmailId("admin@ficcado.com")
                .orElseGet(() -> adminRepository.save(Admin.builder()
                        .adminName("Test Admin")
                        .emailId("admin@ficcado.com")
                        .passwordHash("$2a$10$ecOmlKKAMHPmImwe/hl/YuTP4k..3jN2UW4Yp1RRItvHwVcw4odG2")
                        .role(AdminRole.ADMIN)
                        .isActive(true)
                        .build()));

        adminAuth = new UsernamePasswordAuthenticationToken(
                adminUser,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );

        unprivilegedAuth = new UsernamePasswordAuthenticationToken(
                "guestUser",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
        );

        // Ensure clean test customers in ficcado_data_test
        testCustomer1 = customerRepository.findByPhoneNumber("9999900001")
                .orElseGet(() -> customerRepository.save(Customer.builder()
                        .phoneNumber("9999900001")
                        .customerName("Original Customer One")
                        .emailId("cust1@ficcado.com")
                        .totalOrdersPlaced(2)
                        .createdByAdmin(adminUser)
                        .build()));

        testCustomer2 = customerRepository.findByPhoneNumber("9999900002")
                .orElseGet(() -> customerRepository.save(Customer.builder()
                        .phoneNumber("9999900002")
                        .customerName("Original Customer Two")
                        .emailId("cust2@ficcado.com")
                        .totalOrdersPlaced(1)
                        .createdByAdmin(adminUser)
                        .build()));
    }

    @Test
    @DisplayName("P4C-2: Successful customer update updates name, email, addresses and returns 200")
    void updateCustomer_success() throws Exception {
        CustomerUpdateRequest request = new CustomerUpdateRequest(
                testCustomer1.getPhoneNumber(),
                "Updated Customer One",
                "cust1_new@ficcado.com",
                List.of("123 MG Road, Bangalore", "456 Indiranagar, Bangalore")
        );

        mockMvc.perform(put("/api/customers")
                        .with(authentication(adminAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.customerName").value("Updated Customer One"))
                .andExpect(jsonPath("$.emailId").value("cust1_new@ficcado.com"))
                .andExpect(jsonPath("$.phoneNumber").value(testCustomer1.getPhoneNumber()))
                .andExpect(jsonPath("$.addresses.length()").value(2));

        // Verify DB state
        Customer persisted = customerRepository.findByPhoneNumber(testCustomer1.getPhoneNumber()).orElseThrow();
        assertThat(persisted.getCustomerName()).isEqualTo("Updated Customer One");
        assertThat(persisted.getEmailId()).isEqualTo("cust1_new@ficcado.com");
        assertThat(persisted.getAddresses()).hasSize(2);
        assertThat(persisted.getAddresses().get(0).getAddress()).isEqualTo("123 MG Road, Bangalore");
        assertThat(persisted.getAddresses().get(0).getIsDefault()).isTrue();
    }

    @Test
    @DisplayName("P4C-2: Update by ID succeeds (200)")
    void updateCustomerById_success() throws Exception {
        CustomerUpdateRequest request = new CustomerUpdateRequest(
                testCustomer1.getPhoneNumber(),
                "Updated Name By ID",
                "cust1_id@ficcado.com",
                List.of("789 Koramangala, Bangalore")
        );

        mockMvc.perform(put("/api/customers/" + testCustomer1.getId())
                        .with(authentication(adminAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.customerName").value("Updated Name By ID"))
                .andExpect(jsonPath("$.emailId").value("cust1_id@ficcado.com"));
    }

    @Test
    @DisplayName("P4C-2: Validation error on invalid email format returns 400 Bad Request")
    void updateCustomer_invalidEmail_returns400() throws Exception {
        CustomerUpdateRequest request = new CustomerUpdateRequest(
                testCustomer1.getPhoneNumber(),
                "Customer Name",
                "not-a-valid-email",
                List.of("Some Address")
        );

        mockMvc.perform(put("/api/customers")
                        .with(authentication(adminAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("P4C-2: Duplicate email used by another customer returns 409 Conflict")
    void updateCustomer_duplicateEmail_returns409() throws Exception {
        // Customer 2 already has email cust2@ficcado.com
        CustomerUpdateRequest request = new CustomerUpdateRequest(
                testCustomer1.getPhoneNumber(),
                "Customer One",
                "cust2@ficcado.com",
                List.of("123 MG Road, Bangalore")
        );

        mockMvc.perform(put("/api/customers")
                        .with(authentication(adminAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("P4C-2: Unknown phone number returns 404 Not Found")
    void updateCustomer_unknownPhone_returns404() throws Exception {
        CustomerUpdateRequest request = new CustomerUpdateRequest(
                "9999999999",
                "Nonexistent Customer",
                "nonexistent@ficcado.com",
                List.of()
        );

        mockMvc.perform(put("/api/customers")
                        .with(authentication(adminAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("P4C-2: Unknown customer ID returns 404 Not Found")
    void updateCustomer_unknownId_returns404() throws Exception {
        CustomerUpdateRequest request = new CustomerUpdateRequest(
                testCustomer1.getPhoneNumber(),
                "Customer Name",
                "valid@ficcado.com",
                List.of()
        );

        mockMvc.perform(put("/api/customers/999999")
                        .with(authentication(adminAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("P4C-2: Unauthorized role is denied with 403 Forbidden")
    void updateCustomer_unauthorizedRole_returns403() throws Exception {
        CustomerUpdateRequest request = new CustomerUpdateRequest(
                testCustomer1.getPhoneNumber(),
                "Customer Name",
                "valid@ficcado.com",
                List.of()
        );

        mockMvc.perform(put("/api/customers")
                        .with(authentication(unprivilegedAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}
