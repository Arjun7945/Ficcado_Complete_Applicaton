package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerAuthResponse;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerRegistrationRequest;
import com.aps.ficcado_crm_backend.entity.Customer;
import com.aps.ficcado_crm_backend.repository.CustomerRepository;
import com.aps.ficcado_crm_backend.repository.RevokedTokenRepository;
import com.aps.ficcado_crm_backend.service.CustomerAuthService;
import com.aps.ficcado_crm_backend.service.CustomerSessionService;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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

    @Mock
    private CustomerSessionService customerSessionService;

    @InjectMocks
    private CustomerAuthService customerAuthService;

    private static final String GENERIC_REFUSAL_MSG =
            "We could not create an account with these details. If you already have an account, sign in or use Forgot password.";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(customerAuthService, "jwtSecret", "ficcado-jwt-secret-key-32-bytes-minimum-length-for-hs256!");
        ReflectionTestUtils.setField(customerAuthService, "jwtExpirationMs", 86400000L);
    }

    @Test
    @DisplayName("registerCustomer should hash password, leave emailVerifiedAt null, and return valid token")
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
                .emailVerifiedAt(null)
                .addresses(new ArrayList<>())
                .build();

        when(customerRepository.save(any(Customer.class))).thenReturn(savedCustomer);
        when(customerSessionService.createSession(1L)).thenReturn(
                new com.aps.ficcado_crm_backend.session.CustomerSession(
                        "a".repeat(64), 1L, java.time.Instant.now(), java.time.Instant.now(), null
                )
        );

        CustomerAuthResponse response = customerAuthService.registerCustomer(request);

        assertThat(response.success()).isTrue();
        assertThat(response.token()).isNotNull();
        assertThat(response.customer().email()).isEqualTo("jane@example.com");
        assertThat(response.customer().emailVerified()).isFalse();
    }

    @Test
    @DisplayName("registerCustomer should refuse with generic message if email already exists")
    void registerCustomer_duplicateEmail_refusedWithGenericMessage() {
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
        assertThat(response.message()).isEqualTo(GENERIC_REFUSAL_MSG);
    }

    @Test
    @DisplayName("registerCustomer should refuse with generic message if phone already exists")
    void registerCustomer_duplicatePhone_refusedWithGenericMessage() {
        Customer existingPhoneCustomer = Customer.builder()
                .id(2L)
                .emailId("other@example.com")
                .phoneNumber("9876543210")
                .build();

        when(customerRepository.findByEmailIdIgnoreCase("jane@example.com")).thenReturn(Optional.empty());
        when(customerRepository.findByPhoneNumber("9876543210")).thenReturn(Optional.of(existingPhoneCustomer));

        CustomerRegistrationRequest request = new CustomerRegistrationRequest(
                "Jane Doe", "jane@example.com", "9876543210", "Secret123!", null
        );

        CustomerAuthResponse response = customerAuthService.registerCustomer(request);

        assertThat(response.success()).isFalse();
        assertThat(response.message()).isEqualTo(GENERIC_REFUSAL_MSG);
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
        assertThat(result.get().getEmailId()).isEqualTo("jane@example.com");
    }

    @Test
    @DisplayName("customerExists returns true when present and false when missing")
    void customerExists_check() {
        when(customerRepository.findByEmailIdIgnoreCase("jane@example.com")).thenReturn(Optional.of(mock(Customer.class)));
        when(customerRepository.findByEmailIdIgnoreCase("unknown@example.com")).thenReturn(Optional.empty());

        assertThat(customerAuthService.customerExists("jane@example.com")).isTrue();
        assertThat(customerAuthService.customerExists("unknown@example.com")).isFalse();
        assertThat(customerAuthService.customerExists(null)).isFalse();
    }

    @Test
    @DisplayName("resetPassword sets new BCrypt hash, marks emailVerifiedAt, saves, and deletes all sessions")
    void resetPassword_success() {
        Customer customer = Customer.builder()
                .id(101L)
                .emailId("jane@example.com")
                .passwordHash("oldHash")
                .emailVerifiedAt(null)
                .build();

        when(customerRepository.findByEmailIdIgnoreCase("jane@example.com")).thenReturn(Optional.of(customer));
        when(passwordEncoder.encode("NewSecret123!")).thenReturn("$2a$10$newHash");

        customerAuthService.resetPassword("jane@example.com", "NewSecret123!");

        assertThat(customer.getPasswordHash()).isEqualTo("$2a$10$newHash");
        assertThat(customer.getEmailVerifiedAt()).isNotNull();
        verify(customerRepository, times(1)).save(customer);
        verify(customerSessionService, times(1)).deleteAllSessionsForCustomer(101L);
    }

    @Test
    @DisplayName("resetPassword throws IllegalArgumentException if customer not found")
    void resetPassword_notFound() {
        when(customerRepository.findByEmailIdIgnoreCase("unknown@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerAuthService.resetPassword("unknown@example.com", "NewSecret123!"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Customer not found");
    }
}
