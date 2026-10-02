package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.config.SecurityPropertiesValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SecurityPropertiesValidatorTest {

    @Test
    @DisplayName("Short JWT secret throws IllegalStateException on boot")
    void shortJwtSecret_throwsIllegalStateException() {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[]{"dev"});

        SecurityPropertiesValidator validator = new SecurityPropertiesValidator(env);
        ReflectionTestUtils.setField(validator, "jwtSecret", "too-short");
        ReflectionTestUtils.setField(validator, "dbPassword", "arjun7945");

        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    @DisplayName("Valid JWT secret passes in dev profile")
    void validSecret_passesInDevProfile() {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[]{"dev"});

        SecurityPropertiesValidator validator = new SecurityPropertiesValidator(env);
        ReflectionTestUtils.setField(validator, "jwtSecret", "aVeryLongSecureKeyThatIsGreaterThan32BytesInLength12345!");
        ReflectionTestUtils.setField(validator, "dbPassword", "arjun7945");

        assertDoesNotThrow(validator::validate);
    }

    @Test
    @DisplayName("Default password in production profile throws IllegalStateException")
    void defaultPasswordInProd_throwsIllegalStateException() {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[]{"prod"});

        SecurityPropertiesValidator validator = new SecurityPropertiesValidator(env);
        ReflectionTestUtils.setField(validator, "jwtSecret", "aVeryLongSecureKeyThatIsGreaterThan32BytesInLength12345!");
        ReflectionTestUtils.setField(validator, "dbPassword", "arjun7945");

        assertThrows(IllegalStateException.class, validator::validate);
    }
}
