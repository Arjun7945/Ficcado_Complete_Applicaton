package com.aps.ficcado_website_data.service;

import com.aps.ficcado_website_data.dto.ComplaintRequest;
import com.aps.ficcado_website_data.dto.ComplaintResponse;
import com.aps.ficcado_website_data.entity.CustomerComplaint;
import com.aps.ficcado_website_data.entity.enums.ComplaintStatus;
import com.aps.ficcado_website_data.entity.enums.ComplaintType;
import com.aps.ficcado_website_data.exception.ResourceNotFoundException;
import com.aps.ficcado_website_data.repository.ComplaintRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ComplaintServiceTest {

    @Mock
    private ComplaintRepository complaintRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private ComplaintService complaintService;

    @Test
    void testCreateComplaint_Success() {
        ComplaintRequest request = ComplaintRequest.builder()
                .customerEmail("customer@ficcado.in")
                .customerPhone("9876543210")
                .orderId("FIC-A0002")
                .complaintType(ComplaintType.DEFECTIVE_PRODUCT)
                .description("Stitching flaw on right shoulder.")
                .build();

        ArgumentCaptor<CustomerComplaint> captor = ArgumentCaptor.forClass(CustomerComplaint.class);
        when(complaintRepository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));

        ComplaintResponse response = complaintService.createComplaint(request);

        assertNotNull(response);
        assertTrue(response.getComplaintId().startsWith("FIC-CMP-"));
        assertEquals("customer@ficcado.in", response.getCustomerEmail());
        assertEquals(ComplaintStatus.SUBMITTED, response.getStatus());

        CustomerComplaint saved = captor.getValue();
        assertEquals("FIC-A0002", saved.getOrderId());
        verify(emailService, times(1)).sendComplaintConfirmation(saved);
    }

    @Test
    void testGetComplaintById_NotFound() {
        when(complaintRepository.findByComplaintId("FIC-CMP-0000")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> complaintService.getComplaintById("FIC-CMP-0000"));
    }
}
