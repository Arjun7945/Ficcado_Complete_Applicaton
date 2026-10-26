package com.aps.ficcado_crm_backend.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerLoginRequest;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerRegistrationRequest;
import com.aps.ficcado_crm_backend.service.CustomerAuthService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import com.aps.ficcado_crm_backend.service.CustomerSessionService;
import com.aps.ficcado_crm_backend.session.CustomerSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PiiLogCaptureTest {

    @Autowired
    private CustomerAuthService customerAuthService;

    @MockBean
    private CustomerSessionService customerSessionService;

    private ListAppender<ILoggingEvent> listAppender;
    private Logger rootLogger;

    @BeforeEach
    void setUp() {
        when(customerSessionService.createSession(any())).thenAnswer(inv -> {
            Long cid = inv.getArgument(0);
            return new CustomerSession("mock-session-" + cid, cid, Instant.now(), Instant.now(), null);
        });
        rootLogger = (Logger) LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME);
        listAppender = new ListAppender<>();
        listAppender.start();
        rootLogger.addAppender(listAppender);
    }

    @AfterEach
    void tearDown() {
        if (rootLogger != null && listAppender != null) {
            rootLogger.detachAppender(listAppender);
        }
    }

    @Test
    @DisplayName("AUD-13: Verifies logs capture masks raw customer email, phone, and password")
    void testAuthLogsMaskPii() {
        String rawEmail = "sensitive.customer99@ficcado.store";
        String rawPhone = "9876543210";
        String rawPassword = "SuperSecretPassword123!";

        // 1. Exercise registration
        var regRequest = new CustomerRegistrationRequest(
                "Sensitive Customer",
                rawEmail,
                rawPhone,
                rawPassword,
                "House 42, Marine Drive, Kochi"
        );
        customerAuthService.registerCustomer(regRequest);

        // 2. Exercise authentication
        customerAuthService.authenticate(rawEmail, rawPassword);

        // 3. Inspect all captured log events
        for (ILoggingEvent event : listAppender.list) {
            String formattedMessage = PiiMaskingConverter.mask(event.getFormattedMessage());

            // Assert raw email does not appear in masked log output
            assertThat(formattedMessage)
                    .as("Log message must not contain unmasked email")
                    .doesNotContain(rawEmail);

            // Assert raw password does not appear in any log output
            assertThat(formattedMessage)
                    .as("Log message must never contain raw password")
                    .doesNotContain(rawPassword);

            // Assert raw phone number does not appear in unmasked form
            assertThat(formattedMessage)
                    .as("Log message must not contain unmasked full phone number")
                    .doesNotContain("9876543210");
        }
    }
}
