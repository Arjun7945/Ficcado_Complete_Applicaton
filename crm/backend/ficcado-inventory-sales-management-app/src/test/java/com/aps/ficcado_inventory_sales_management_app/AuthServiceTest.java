package com.aps.ficcado_inventory_sales_management_app;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.AdminRole;
import com.aps.ficcado_inventory_sales_management_app.repository.AdminRepository;
import com.aps.ficcado_inventory_sales_management_app.repository.RevokedTokenRepository;
import com.aps.ficcado_inventory_sales_management_app.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private RevokedTokenRepository revokedTokenRepository;

    @Mock
    private BCryptPasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    private Admin activeAdmin;

    @BeforeEach
    void setUp() {
        // Set a 32-byte secret for JWT tests
        ReflectionTestUtils.setField(authService, "jwtSecret", "ThisIsASecretKeyWithMoreThan32BytesLongForTesting!");
        ReflectionTestUtils.setField(authService, "jwtExpirationMs", 3600000L);

        activeAdmin = Admin.builder()
                .id(1L)
                .adminName("Super Admin")
                .emailId("admin@ficcado.com")
                .passwordHash("$2a$12$hashedPasswordExample")
                .role(AdminRole.SUPERADMIN)
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("Email login rejection if non-email format is supplied")
    void authenticate_shouldRejectNonEmail() {
        Optional<Admin> result = authService.authenticate("admin_user", "password123");
        assertTrue(result.isEmpty());
        verifyNoInteractions(adminRepository);
    }

    @Test
    @DisplayName("Successful authentication with valid email and matching password")
    void authenticate_shouldSucceedWithValidCredentials() {
        when(adminRepository.findByEmailIdIgnoreCase("admin@ficcado.com"))
                .thenReturn(Optional.of(activeAdmin));
        when(passwordEncoder.matches("password123", activeAdmin.getPasswordHash()))
                .thenReturn(true);

        Optional<Admin> result = authService.authenticate("admin@ficcado.com", "password123");

        assertTrue(result.isPresent());
        assertEquals("admin@ficcado.com", result.get().getEmailId());
    }

    @Test
    @DisplayName("JWT generation and claims validation round-trip")
    void tokenGenerationAndValidation_shouldWorkConsistently() {
        String token = authService.generateToken(activeAdmin);
        assertNotNull(token);
        assertFalse(token.isBlank());

        var claims = authService.validateToken(token);
        assertEquals("1", claims.getSubject());
        assertEquals("admin@ficcado.com", claims.get("email"));
        assertEquals("SUPERADMIN", claims.get("role"));
    }

    @Test
    @DisplayName("Token revocation adds to cache and repository")
    void revokeToken_shouldMarkRevoked() {
        String token = authService.generateToken(activeAdmin);

        when(revokedTokenRepository.existsByTokenHash(anyString())).thenReturn(false);

        authService.revokeToken(token, activeAdmin);

        verify(revokedTokenRepository, times(1)).save(any());
        // Subsequent revocation check should hit in-memory cache
        assertTrue(authService.isTokenRevoked(token));
    }
}
