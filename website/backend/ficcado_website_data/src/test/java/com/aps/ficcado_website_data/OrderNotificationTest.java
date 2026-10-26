package com.aps.ficcado_website_data;

import com.aps.ficcado_website_data.dto.OrderStatusNotificationRequest;
import com.aps.ficcado_website_data.entity.OrderNotification;
import com.aps.ficcado_website_data.entity.enums.EmailType;
import com.aps.ficcado_website_data.repository.OrderNotificationRepository;
import com.aps.ficcado_website_data.service.EmailService;
import com.aps.ficcado_website_data.service.OrderNotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrderNotificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private OrderNotificationService orderNotificationService;

    @Autowired
    private OrderNotificationRepository orderNotificationRepository;

    @MockBean
    private EmailService emailService;

    private static final String SECRET = "ficcado-internal-service-secret-key-change-in-prod";

    @Test
    @DisplayName("COMPLETED notification: sends confirmation email with invoice and records notification")
    void completedStatusSendsConfirmationEmail() {
        String txId = "FIC-TXN-NOTIF-COMPLETED";
        OrderStatusNotificationRequest request = new OrderStatusNotificationRequest(
                "ORDER_STATUS_CHANGED",
                txId,
                "order_comp_123",
                "COMPLETED",
                "FIC-INV-9999",
                88L,
                "customer@ficcado.in",
                "Arjun P",
                BigDecimal.valueOf(1499),
                null
        );

        OrderNotification notif = orderNotificationService.processOrderStatus(request);

        assertThat(notif).isNotNull();
        assertThat(notif.getOrderStatus()).isEqualTo("COMPLETED");
        assertThat(notif.getInvoiceNumber()).isEqualTo("FIC-INV-9999");
        assertThat(notif.isEmailSent()).isTrue();

        verify(emailService, times(1)).sendEmail(
                eq("customer@ficcado.in"),
                contains("Invoice FIC-INV-9999"),
                contains("FIC-INV-9999"),
                contains("FIC-INV-9999"),
                eq(EmailType.NOTIFICATION)
        );
    }

    @Test
    @DisplayName("FAILED notification: sends failure email without creating order")
    void failedStatusSendsFailureEmail() {
        String txId = "FIC-TXN-NOTIF-FAILED";
        OrderStatusNotificationRequest request = new OrderStatusNotificationRequest(
                "ORDER_STATUS_CHANGED",
                txId,
                "order_fail_123",
                "FAILED",
                null,
                null,
                "failed.cust@ficcado.in",
                "Rahul",
                BigDecimal.valueOf(2499),
                "Card declined"
        );

        OrderNotification notif = orderNotificationService.processOrderStatus(request);

        assertThat(notif).isNotNull();
        assertThat(notif.getOrderStatus()).isEqualTo("FAILED");
        assertThat(notif.getMessage()).isEqualTo("Card declined");

        verify(emailService, times(1)).sendEmail(
                eq("failed.cust@ficcado.in"),
                contains("Failed"),
                contains("Card declined"),
                contains("Card declined"),
                eq(EmailType.NOTIFICATION)
        );
    }

    @Test
    @DisplayName("REFUND_PENDING notification: sends refund email requesting customer to try again")
    void refundStatusSendsRefundEmail() {
        String txId = "FIC-TXN-NOTIF-REFUND";
        OrderStatusNotificationRequest request = new OrderStatusNotificationRequest(
                "ORDER_STATUS_CHANGED",
                txId,
                "order_refund_123",
                "REFUND_PENDING",
                null,
                null,
                "refund.cust@ficcado.in",
                "Ganga",
                BigDecimal.valueOf(1499),
                "Insufficient stock at drop"
        );

        OrderNotification notif = orderNotificationService.processOrderStatus(request);

        assertThat(notif).isNotNull();
        assertThat(notif.getOrderStatus()).isEqualTo("REFUND_PENDING");

        verify(emailService, times(1)).sendEmail(
                eq("refund.cust@ficcado.in"),
                contains("Refund"),
                contains("full refund"),
                contains("full refund"),
                eq(EmailType.NOTIFICATION)
        );
    }

    @Test
    @DisplayName("Idempotency: duplicate notification for same transaction is ignored, exactly one email sent")
    void duplicateNotificationIsIdempotent() {
        String txId = "FIC-TXN-IDEMPOTENT-1";
        OrderStatusNotificationRequest request = new OrderStatusNotificationRequest(
                "ORDER_STATUS_CHANGED",
                txId,
                "order_idem_123",
                "COMPLETED",
                "FIC-INV-IDEM",
                55L,
                "idem@ficcado.in",
                "Idem User",
                BigDecimal.valueOf(999),
                null
        );

        // Call 1
        orderNotificationService.processOrderStatus(request);
        // Call 2
        orderNotificationService.processOrderStatus(request);

        // Assert exactly one row exists in DB
        assertThat(orderNotificationRepository.findByTransactionId(txId)).isPresent();

        // Exactly one email sent
        verify(emailService, times(1)).sendEmail(
                eq("idem@ficcado.in"),
                anyString(),
                anyString(),
                anyString(),
                any()
        );
    }

    @Test
    @DisplayName("Internal API endpoint requires X-Internal-Secret")
    void internalEndpointRequiresSecret() throws Exception {
        OrderStatusNotificationRequest request = new OrderStatusNotificationRequest(
                "ORDER_STATUS_CHANGED",
                "FIC-TXN-ENDPOINT-TEST",
                "order_ep_123",
                "COMPLETED",
                "FIC-INV-EP",
                12L,
                "ep@ficcado.in",
                "EP User",
                BigDecimal.valueOf(1499),
                null
        );

        // Missing secret -> 403 Forbidden
        mockMvc.perform(post("/api/internal/notifications/order-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        // Valid secret -> 200 OK
        mockMvc.perform(post("/api/internal/notifications/order-status")
                        .header("X-Internal-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
