package com.aps.ficcado_website_data.controller;

import com.aps.ficcado_website_data.dto.EnquiryRequest;
import com.aps.ficcado_website_data.dto.EnquiryResponse;
import com.aps.ficcado_website_data.entity.enums.EnquiryCategory;
import com.aps.ficcado_website_data.entity.enums.EnquiryStatus;
import com.aps.ficcado_website_data.service.EnquiryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EnquiryController.class)
class EnquiryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private EnquiryService enquiryService;

    @Test
    void testCreateEnquiry_ValidRequest_Returns201() throws Exception {
        EnquiryRequest request = EnquiryRequest.builder()
                .fullName("Aarav Patel")
                .email("aarav@example.com")
                .category(EnquiryCategory.SIZING_FIT)
                .subject("Need size recommendation for Chosen Oversized Tee")
                .message("My chest is 40 inches, should I get M or L?")
                .build();

        EnquiryResponse response = EnquiryResponse.builder()
                .ticketId("FIC-INQ-20261020-1234")
                .fullName(request.getFullName())
                .email(request.getEmail())
                .category(request.getCategory())
                .subject(request.getSubject())
                .message(request.getMessage())
                .status(EnquiryStatus.OPEN)
                .createdAt(Instant.now())
                .build();

        when(enquiryService.createEnquiry(any(EnquiryRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/enquiries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.ticketId").value("FIC-INQ-20261020-1234"))
                .andExpect(jsonPath("$.data.fullName").value("Aarav Patel"));
    }

    @Test
    void testCreateEnquiry_InvalidEmail_Returns400() throws Exception {
        EnquiryRequest request = EnquiryRequest.builder()
                .fullName("Aarav Patel")
                .email("invalid-email")
                .category(EnquiryCategory.SIZING_FIT)
                .subject("Size query")
                .message("Hello")
                .build();

        mockMvc.perform(post("/api/v1/enquiries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testGetEnquiry_Returns200() throws Exception {
        EnquiryResponse response = EnquiryResponse.builder()
                .ticketId("FIC-INQ-20261020-1234")
                .fullName("Aarav Patel")
                .email("aarav@example.com")
                .status(EnquiryStatus.OPEN)
                .build();

        when(enquiryService.getEnquiryByTicketId("FIC-INQ-20261020-1234")).thenReturn(response);

        mockMvc.perform(get("/api/v1/enquiries/FIC-INQ-20261020-1234"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.ticketId").value("FIC-INQ-20261020-1234"));
    }
}
