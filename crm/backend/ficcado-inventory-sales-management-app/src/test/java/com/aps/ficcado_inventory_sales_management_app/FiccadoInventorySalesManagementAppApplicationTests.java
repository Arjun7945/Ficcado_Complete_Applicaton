package com.aps.ficcado_inventory_sales_management_app;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

class FiccadoInventorySalesManagementAppApplicationTests {

    @Test
    void testPasswordEncodingAndVerification() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String rawPassword = "admin123";
        String encodedHash = encoder.encode(rawPassword);

        assertThat(encodedHash).isNotEmpty();
        assertThat(encoder.matches(rawPassword, encodedHash)).isTrue();
        assertThat(encoder.matches("wrongpassword", encodedHash)).isFalse();
    }
}
