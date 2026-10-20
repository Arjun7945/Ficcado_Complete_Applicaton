package com.aps.ficcado_payment_gateway_data;

import com.aps.ficcado_payment_gateway_data.dto.PaymentDto.*;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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
    @DisplayName("verifyPayment verifies signature and triggers sync to Ficcado-Data")
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
            arg.setSyncStatus("SYNCED_TO_FICCADO_DATA");
            arg.setFiccadoInvoiceNumber("FIC-INV-TEST");
            arg.setFiccadoSaleId(101L);
            transactionRepository.save(arg);
            return true;
        });

        String signature = razorpayService.calculateHmacSha256(orderId + "|" + paymentId, secret);

        VerifyPaymentRequest request = new VerifyPaymentRequest(orderId, paymentId, signature);

        mockMvc.perform(post("/api/v1/payments/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.verified").value(true))
                .andExpect(jsonPath("$.invoiceNumber").value("FIC-INV-TEST"))
                .andExpect(jsonPath("$.saleId").value(101));
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
                .amount(BigDecimal.valueOf(2499))
                .customerName("Rohith")
                .customerEmail("rohith@ficcado.in")
                .customerPhone("9876543210")
                .shippingAddress("Bangalore")
                .orderItemsJson("[]")
                .paymentStatus("CAPTURED")
                .syncStatus("SYNCED_TO_FICCADO_DATA")
                .ficcadoInvoiceNumber("FIC-INV-STATUS")
                .build();
        transactionRepository.save(tx);

        mockMvc.perform(get("/api/v1/payments/status/FIC-TXN-STATUS-TEST"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionId").value("FIC-TXN-STATUS-TEST"))
                .andExpect(jsonPath("$.paymentStatus").value("CAPTURED"))
                .andExpect(jsonPath("$.invoiceNumber").value("FIC-INV-STATUS"));
    }
}
