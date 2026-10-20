package com.aps.ficcado_website_data.service;

import com.aps.ficcado_website_data.dto.EnquiryRequest;
import com.aps.ficcado_website_data.dto.EnquiryResponse;
import com.aps.ficcado_website_data.entity.CustomerEnquiry;
import com.aps.ficcado_website_data.entity.enums.EnquiryCategory;
import com.aps.ficcado_website_data.entity.enums.EnquiryStatus;
import com.aps.ficcado_website_data.exception.ResourceNotFoundException;
import com.aps.ficcado_website_data.repository.EnquiryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EnquiryServiceTest {

    @Mock
    private EnquiryRepository enquiryRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private EnquiryService enquiryService;

    @Test
    void testCreateEnquiry_Success() {
        EnquiryRequest request = EnquiryRequest.builder()
                .fullName("Rohit Sharma")
                .email("rohit@example.com")
                .phone("9876543210")
                .orderId("FIC-A0001")
                .category(EnquiryCategory.ORDER_STATUS)
                .subject("Where is my order?")
                .message("I ordered yesterday and want to know delivery status.")
                .build();

        ArgumentCaptor<CustomerEnquiry> captor = ArgumentCaptor.forClass(CustomerEnquiry.class);
        when(enquiryRepository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));

        EnquiryResponse response = enquiryService.createEnquiry(request);

        assertNotNull(response);
        assertTrue(response.getTicketId().startsWith("FIC-INQ-"));
        assertEquals("Rohit Sharma", response.getFullName());
        assertEquals("rohit@example.com", response.getEmail());
        assertEquals(EnquiryStatus.OPEN, response.getStatus());

        CustomerEnquiry saved = captor.getValue();
        assertEquals("FIC-A0001", saved.getOrderId());
        verify(emailService, times(1)).sendEnquiryConfirmation(saved);
    }

    @Test
    void testGetEnquiryByTicketId_NotFound() {
        when(enquiryRepository.findByTicketId("FIC-INQ-9999")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> enquiryService.getEnquiryByTicketId("FIC-INQ-9999"));
    }
}
