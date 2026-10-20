package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerAuthResponse;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerRegistrationRequest;
import com.aps.ficcado_crm_backend.entity.Customer;
import com.aps.ficcado_crm_backend.repository.CustomerRepository;
import com.aps.ficcado_crm_backend.repository.RevokedTokenRepository;
import com.aps.ficcado_crm_backend.service.CustomerAuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerAuthServiceTest {

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private RevokedTokenRepository revokedTokenRepository;

    @Mock
    private BCryptPasswordEncoder passwordEncoder;

    @InjectMocks
    private CustomerAuthService customerAuthService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(customerAuthService, "jwtSecret", "ficcado-jwt-secret-key-32-bytes-minimum-length-for-hs256!");
        ReflectionTestUtils.setField(customerAuthService, "jwtExpirationMs", 86400000L);
    }

    @Test
    @DisplayName("registerCustomer should hash password and return valid token")
    void registerCustomer_success() {
        CustomerRegistrationRequest request = new CustomerRegistrationRequest(
                "Jane Doe", "jane@example.com", "9876543210", "Secret123!", "123 Street"
        );

        when(customerRepository.findByEmailIdIgnoreCase("jane@example.com")).thenReturn(Optional.empty());
        when(customerRepository.findByPhoneNumber("9876543210")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Secret123!")).thenReturn("$2a$10$hashedPassword");

        Customer savedCustomer = Customer.builder()
                .id(1L)
                .customerName("Jane Doe")
                .emailId("jane@example.com")
                .phoneNumber("9876543210")
                .passwordHash("$2a$10$hashedPassword")
                .addresses(new ArrayList<>())
                .build();

        when(customerRepository.save(any(Customer.class))).thenReturn(savedCustomer);

        CustomerAuthResponse response = customerAuthService.registerCustomer(request);

        assertThat(response.success()).isTrue();
        assertThat(response.token()).isNotNull();
        assertThat(response.customer().email()).isEqualTo("jane@example.com");
    }

    @Test
    @DisplayName("registerCustomer should reject if email already has password")
    void registerCustomer_duplicateEmailWithPassword_rejected() {
        Customer existing = Customer.builder()
                .id(1L)
                .emailId("jane@example.com")
                .passwordHash("$2a$10$alreadyHasHash")
                .build();

        when(customerRepository.findByEmailIdIgnoreCase("jane@example.com")).thenReturn(Optional.of(existing));

        CustomerRegistrationRequest request = new CustomerRegistrationRequest(
                "Jane Doe", "jane@example.com", "9876543210", "Secret123!", null
        );

        CustomerAuthResponse response = customerAuthService.registerCustomer(request);

        assertThat(response.success()).isFalse();
        assertThat(response.message()).contains("already exists");
    }

    @Test
    @DisplayName("registerCustomer should require OTP if existing CRM customer has no password (Q-005 item 3)")
    void registerCustomer_existingCrmCustomerWithoutPassword_promptsOtp() {
        Customer crmCustomer = Customer.builder()
                .id(1L)
                .emailId("crm@example.com")
                .phoneNumber("9876543210")
                .passwordHash(null) // created via offline sale
                .build();

        when(customerRepository.findByEmailIdIgnoreCase("crm@example.com")).thenReturn(Optional.of(crmCustomer));

        CustomerRegistrationRequest request = new CustomerRegistrationRequest(
                "Jane Doe", "crm@example.com", "9876543210", "Secret123!", null
        );

        CustomerAuthResponse response = customerAuthService.registerCustomer(request);

        assertThat(response.success()).isFalse();
        assertThat(response.message()).contains("OTP");
    }

    @Test
    @DisplayName("authenticate returns customer when password matches")
    void authenticate_validPassword_returnsCustomer() {
        Customer customer = Customer.builder()
                .id(1L)
                .emailId("jane@example.com")
                .passwordHash("$2a$10$hashedPassword")
                .build();

        when(customerRepository.findByEmailIdIgnoreCase("jane@example.com")).thenReturn(Optional.of(customer));
        when(passwordEncoder.matches("mypassword", "$2a$10$hashedPassword")).thenReturn(true);

        Optional<Customer> result = customerAuthService.authenticate("jane@example.com", "mypassword");

        assertThat(result).isPresent();
        assertThat(result.get().getId()).isEqualTo(1L);
    }
}
