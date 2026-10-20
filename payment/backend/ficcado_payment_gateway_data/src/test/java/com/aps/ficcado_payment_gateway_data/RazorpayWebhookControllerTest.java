package com.aps.ficcado_payment_gateway_data;

import com.aps.ficcado_payment_gateway_data.entity.PaymentTransaction;
import com.aps.ficcado_payment_gateway_data.repository.PaymentTransactionRepository;
import com.aps.ficcado_payment_gateway_data.repository.WebhookLogRepository;
import com.aps.ficcado_payment_gateway_data.service.FiccadoDataSyncService;
import com.aps.ficcado_payment_gateway_data.service.RazorpayService;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RazorpayWebhookControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RazorpayService razorpayService;

    @MockBean
    private FiccadoDataSyncService syncService;

    @Autowired
    private PaymentTransactionRepository transactionRepository;

    @Autowired
    private WebhookLogRepository webhookLogRepository;

    @Test
    @DisplayName("webhook rejects requests with missing or invalid signature")
    void rejectsInvalidSignature() throws Exception {
        String payload = "{\"event\":\"payment.captured\"}";

        mockMvc.perform(post("/api/v1/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/webhooks/razorpay")
                        .header("X-Razorpay-Signature", "wrong_sig")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("webhook processes payment.captured and ignores duplicate event (idempotency)")
    void processesCapturedAndIgnoresDuplicate() throws Exception {
        String orderId = "order_wh_test";
        String paymentId = "pay_wh_test";
        String eventId = "evt_wh_captured_1";

        PaymentTransaction tx = PaymentTransaction.builder()
                .transactionId("FIC-TXN-WH-1")
                .razorpayOrderId(orderId)
                .amount(BigDecimal.valueOf(1499))
                .customerName("Webhook User")
                .customerEmail("webhook@ficcado.in")
                .customerPhone("9876543210")
                .shippingAddress("Aluva")
                .orderItemsJson("[]")
                .paymentStatus("CREATED")
                .syncStatus("PENDING")
                .build();
        transactionRepository.save(tx);

        String payload = """
                {
                    "event_id": "%s",
                    "event": "payment.captured",
                    "payload": {
                        "payment": {
                            "entity": {
                                "id": "%s",
                                "order_id": "%s",
                                "status": "captured"
                            }
                        }
                    }
                }
                """.formatted(eventId, paymentId, orderId);

        String signature = razorpayService.calculateHmacSha256(payload, "rzp_test_webhook_secret");

        // 1. First event call: Should process and trigger sync
        mockMvc.perform(post("/api/v1/webhooks/razorpay")
                        .header("X-Razorpay-Signature", signature)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"));

        verify(syncService, times(1)).syncSaleToFiccadoData(any());

        PaymentTransaction updated = transactionRepository.findByRazorpayOrderId(orderId).orElseThrow();
        assertEquals("CAPTURED", updated.getPaymentStatus());
        assertEquals(paymentId, updated.getRazorpayPaymentId());

        // 2. Second event call with same event_id: Should be ignored idempotently without calling syncService again
        mockMvc.perform(post("/api/v1/webhooks/razorpay")
                        .header("X-Razorpay-Signature", signature)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("already_processed"));

        verify(syncService, times(1)).syncSaleToFiccadoData(any());
    }
}
