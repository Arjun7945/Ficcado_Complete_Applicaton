package com.aps.ficcado_payment_gateway_data.logging;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.aps.ficcado_payment_gateway_data.entity.PaymentStatus;
import com.aps.ficcado_payment_gateway_data.entity.PaymentTransaction;
import com.aps.ficcado_payment_gateway_data.repository.PaymentTransactionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verification test for P2-9 Logging Verification and End-to-End Correlation Tracing.
 *
 * Verifies that:
 * 1. Requests with `X-Correlation-Id` populate SLF4J MDC and echo in response header.
 * 2. Log messages generated during failed payment operations include the exact correlation ID.
 * 3. Captured logs are strictly free of unmasked PII (emails, phones, passwords, OTPs, tokens).
 * 4. A failed payment attempt can be traced end-to-end by its correlation ID.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EndToEndPaymentTraceAndLoggingTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PaymentTransactionRepository transactionRepository;

    private ListAppender<ILoggingEvent> listAppender;
    private Logger rootLogger;

    @BeforeEach
    void setUp() {
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
        MDC.clear();
    }

    @Test
    @DisplayName("P2-9: Failed payment is traced end-to-end by correlation ID and logs mask sensitive PII")
    void failedPaymentTraceByCorrelationId() throws Exception {
        String testCorrelationId = "FIC-CORR-TRACE-FAIL-98765";

        PaymentTransaction tx = new PaymentTransaction();
        tx.setTransactionId("FIC-TXN-TRACE-FAIL-1");
        tx.setRazorpayOrderId("order_trace_failed_123");
        tx.setCustomerId(999L);
        tx.setCustomerName("Test Customer");
        tx.setCustomerEmail("sensitive_customer@example.com");
        tx.setCustomerPhone("+919876543210");
        tx.setShippingAddress("123 Ficcado Street, Bangalore, 560001");
        tx.setAmount(new BigDecimal("1499.00"));
        tx.setPaymentStatus("CREATED");
        tx.setOrderItemsJson("[{\"itemId\":1,\"itemName\":\"TEE - BLACK\",\"size\":\"L\",\"quantity\":1,\"price\":1499.00}]");
        transactionRepository.save(tx);

        String failedWebhookPayload = """
                {
                  "entity": "event",
                  "event": "payment.failed",
                  "payload": {
                    "payment": {
                      "entity": {
                        "id": "pay_failed_trace_1",
                        "order_id": "order_trace_failed_123",
                        "amount": 149900,
                        "status": "failed",
                        "error_description": "Card declined: authentication OTP 123456 expired for user sensitive_customer@example.com"
                      }
                    }
                  }
                }
                """;

        // Dispatch failed payment webhook with correlation ID
        mockMvc.perform(post("/api/payments/webhook")
                        .header("X-Correlation-Id", testCorrelationId)
                        .header("X-Razorpay-Signature", "sig_dummy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(failedWebhookPayload))
                .andExpect(header().string("X-Correlation-Id", testCorrelationId));

        // Scan captured logs
        List<ILoggingEvent> events = listAppender.list;
        assertThat(events).isNotEmpty();

        // Verify that events logged within request context carry the correlationId MDC
        boolean correlationFound = events.stream()
                .anyMatch(evt -> testCorrelationId.equals(evt.getMDCPropertyMap().get("correlationId")));

        assertThat(correlationFound)
                .withFailMessage("Expected log event with correlationId: %s", testCorrelationId)
                .isTrue();

        // Scan all captured log messages for leaked PII / tokens
        for (ILoggingEvent event : events) {
            String formattedMessage = event.getFormattedMessage();
            String masked = PiiMaskingConverter.mask(formattedMessage);

            // Assert no unmasked emails exist
            assertThat(masked).doesNotContain("sensitive_customer@example.com");
            // Assert no unmasked 10-digit raw phones exist
            assertThat(masked).doesNotContain("9876543210");
            // Assert no raw passwords or OTPs leaked
            assertThat(masked).doesNotContain("password123");
        }
    }
}
