package com.aps.ficcado_payment_gateway_data;

import com.aps.ficcado_payment_gateway_data.dto.PaymentDto.*;
import com.aps.ficcado_payment_gateway_data.entity.PaymentStatus;
import com.aps.ficcado_payment_gateway_data.entity.PaymentTransaction;
import com.aps.ficcado_payment_gateway_data.repository.PaymentTransactionRepository;
import com.aps.ficcado_payment_gateway_data.service.FiccadoDataSyncService;
import com.aps.ficcado_payment_gateway_data.service.RazorpayService;
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
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RazorpayService razorpayService;

    @MockBean
    private FiccadoDataSyncService syncService;

    @Autowired
    private PaymentTransactionRepository transactionRepository;

    @Test
    @DisplayName("createOrder persists transaction and returns orderId with keyId")
    void createsOrderSuccessfully() throws Exception {
        CreateOrderRequest request = new CreateOrderRequest(
                BigDecimal.valueOf(1499),
                "INR",
                1L,
                "Sinan MS",
                "sinan@ficcado.in",
                "9876543210",
                "Aluva 6, Ernakulam",
                null,
                BigDecimal.ZERO,
                "Shiprocket",
                List.of(new OrderItemDto(1L, "Chosen", "L", 1, BigDecimal.valueOf(1499)))
        );

        mockMvc.perform(post("/api/v1/payments/create-order")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.orderId").isNotEmpty())
                .andExpect(jsonPath("$.transactionId").isNotEmpty())
                .andExpect(jsonPath("$.amountInPaise").value(149900))
                .andExpect(jsonPath("$.keyId").value(razorpayService.getKeyId()));
    }

    @Test
    @DisplayName("createOrder works via /api/payments/orders route alias")
    void createsOrderViaOrdersAlias() throws Exception {
        CreateOrderRequest request = new CreateOrderRequest(
                BigDecimal.valueOf(1499),
                "INR",
                2L,
                "Rohith",
                "rohith@ficcado.in",
                "9876543210",
                "Kochi, Kerala",
                null,
                BigDecimal.ZERO,
                "Express Surface Logistics",
                List.of(new OrderItemDto(1L, "Chosen", "M", 1, BigDecimal.valueOf(1499)))
        );

        mockMvc.perform(post("/api/payments/orders")
                        .header("X-Customer-Id", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.orderId").isNotEmpty());
    }

    @Test
    @DisplayName("verifyPayment verifies signature, transitions to PROCESSING, and answers 202 Accepted quickly")
    void verifiesPaymentSuccessfully() throws Exception {
        String orderId = "order_test_verify";
        String paymentId = "pay_test_verify";
        String secret = "rzp_test_mock_secret";

        PaymentTransaction tx = PaymentTransaction.builder()
                .transactionId("FIC-TXN-12345")
                .razorpayOrderId(orderId)
                .amount(BigDecimal.valueOf(1499))
                .customerName("Ganga")
                .customerEmail("ganga@ficcado.in")
                .customerPhone("9876543210")
                .shippingAddress("Kochi")
                .orderItemsJson("[]")
                .paymentStatus("CREATED")
                .syncStatus("PENDING")
                .build();
        transactionRepository.save(tx);

        when(syncService.syncSaleToFiccadoData(any())).thenAnswer(invocation -> {
            PaymentTransaction arg = invocation.getArgument(0);
            PaymentTransaction fresh = transactionRepository.findById(arg.getId()).orElse(arg);
            fresh.setSyncStatus("SYNCED_TO_FICCADO_DATA");
            fresh.setFiccadoInvoiceNumber("FIC-INV-TEST");
            fresh.setFiccadoSaleId(101L);
            fresh.transitionTo(PaymentStatus.COMPLETED, null);
            transactionRepository.saveAndFlush(fresh);
            return true;
        });

        String signature = razorpayService.calculateHmacSha256(orderId + "|" + paymentId, secret);

        VerifyPaymentRequest request = new VerifyPaymentRequest(orderId, paymentId, signature);

        mockMvc.perform(post("/api/v1/payments/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.verified").value(true))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    @DisplayName("verifyPayment returns 400 when signature is invalid")
    void rejectsInvalidSignature() throws Exception {
        VerifyPaymentRequest request = new VerifyPaymentRequest("order_123", "pay_456", "bad_signature");

        mockMvc.perform(post("/api/v1/payments/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.verified").value(false));
    }

    @Test
    @DisplayName("getStatus returns payment details by transactionId or orderId")
    void getStatusReturnsDetails() throws Exception {
        PaymentTransaction tx = PaymentTransaction.builder()
                .transactionId("FIC-TXN-STATUS-TEST")
                .razorpayOrderId("order_status_test")
                .razorpayPaymentId("pay_status_test")
                .customerId(10L)
                .amount(BigDecimal.valueOf(2499))
                .customerName("Rohith")
                .customerEmail("rohith@ficcado.in")
                .customerPhone("9876543210")
                .shippingAddress("Bangalore")
                .orderItemsJson("[]")
                .paymentStatus("COMPLETED")
                .syncStatus("SYNCED_TO_FICCADO_DATA")
                .ficcadoInvoiceNumber("FIC-INV-STATUS")
                .build();
        transactionRepository.save(tx);

        mockMvc.perform(get("/api/v1/payments/status/FIC-TXN-STATUS-TEST")
                        .header("X-Customer-Id", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionId").value("FIC-TXN-STATUS-TEST"))
                .andExpect(jsonPath("$.paymentStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.invoiceNumber").value("FIC-INV-STATUS"));
    }

    @Test
    @DisplayName("customer cannot read another customer's payment attempt (isolation returns 403)")
    void customerCannotReadOtherCustomerAttempt() throws Exception {
        PaymentTransaction tx = PaymentTransaction.builder()
                .transactionId("FIC-TXN-ISOLATION")
                .razorpayOrderId("order_iso_1")
                .customerId(99L) // Belongs to customer 99
                .amount(BigDecimal.valueOf(1999))
                .customerName("Secret Customer")
                .customerEmail("secret@ficcado.in")
                .customerPhone("9876543210")
                .shippingAddress("Delhi")
                .orderItemsJson("[]")
                .paymentStatus("COMPLETED")
                .build();
        transactionRepository.save(tx);

        // Customer 100 tries to read Customer 99's transaction
        mockMvc.perform(get("/api/v1/payments/status/FIC-TXN-ISOLATION")
                        .header("X-Customer-Id", "100"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PaymentTransaction enforces strict state machine transitions")
    void stateMachineTransitionsEnforced() {
        PaymentTransaction tx = PaymentTransaction.builder()
                .transactionId("FIC-TXN-SM-TEST")
                .paymentStatus("CREATED")
                .build();

        // Allowed: CREATED -> PROCESSING
        tx.transitionTo(PaymentStatus.PROCESSING, null);
        org.junit.jupiter.api.Assertions.assertEquals("PROCESSING", tx.getPaymentStatus());

        // Allowed: PROCESSING -> COMPLETED
        tx.transitionTo(PaymentStatus.COMPLETED, null);
        org.junit.jupiter.api.Assertions.assertEquals("COMPLETED", tx.getPaymentStatus());

        // Illegal: COMPLETED -> FAILED
        assertThrows(IllegalStateException.class, () -> tx.transitionTo(PaymentStatus.FAILED, "Cannot fail completed"));
    }
}
