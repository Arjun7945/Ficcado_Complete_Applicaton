package com.aps.ficcado_website_data.controller;

import com.aps.ficcado_website_data.dto.OtpGenerateRequest;
import com.aps.ficcado_website_data.dto.OtpGenerateResponse;
import com.aps.ficcado_website_data.dto.OtpVerifyRequest;
import com.aps.ficcado_website_data.dto.OtpVerifyResponse;
import com.aps.ficcado_website_data.entity.enums.OtpPurpose;
import com.aps.ficcado_website_data.service.OtpService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OtpController.class)
class OtpControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OtpService otpService;

    @Test
    void testGenerateOtp_Valid_Returns200() throws Exception {
        OtpGenerateRequest request = OtpGenerateRequest.builder()
                .email("test@ficcado.in")
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .build();

        OtpGenerateResponse response = OtpGenerateResponse.builder()
                .email("test@ficcado.in")
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .expiresInSeconds(600)
                .message("Verification code sent.")
                .build();

        when(otpService.generateOtp(any(OtpGenerateRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/otp/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("test@ficcado.in"))
                .andExpect(jsonPath("$.data.expiresInSeconds").value(600));
    }

    @Test
    void testVerifyOtp_Valid_Returns200() throws Exception {
        OtpVerifyRequest request = OtpVerifyRequest.builder()
                .email("test@ficcado.in")
                .otp("123456")
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .build();

        OtpVerifyResponse response = OtpVerifyResponse.builder()
                .verified(true)
                .email("test@ficcado.in")
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .verificationToken("mock-token-uuid")
                .message("Verification successful.")
                .build();

        when(otpService.verifyOtp(any(OtpVerifyRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/otp/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.verified").value(true))
                .andExpect(jsonPath("$.data.verificationToken").value("mock-token-uuid"));
    }

    @Test
    void testVerifyOtp_InvalidFormat_Returns400() throws Exception {
        OtpVerifyRequest request = OtpVerifyRequest.builder()
                .email("test@ficcado.in")
                .otp("123") // Not 6 digits
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .build();

        mockMvc.perform(post("/api/v1/otp/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
