package com.aps.ficcado_website_data.service;

import com.aps.ficcado_website_data.dto.EnquiryRequest;
import com.aps.ficcado_website_data.dto.EnquiryResponse;
import com.aps.ficcado_website_data.entity.CustomerEnquiry;
import com.aps.ficcado_website_data.entity.enums.EnquiryStatus;
import com.aps.ficcado_website_data.exception.ResourceNotFoundException;
import com.aps.ficcado_website_data.repository.EnquiryRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnquiryService {

    private static final Logger log = LoggerFactory.getLogger(EnquiryService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final EnquiryRepository enquiryRepository;
    private final EmailService emailService;

    @Transactional
    public EnquiryResponse createEnquiry(EnquiryRequest request) {
        String ticketId = generateTicketId();

        CustomerEnquiry enquiry = CustomerEnquiry.builder()
                .ticketId(ticketId)
                .fullName(request.getFullName().trim())
                .email(request.getEmail().trim().toLowerCase())
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .orderId(request.getOrderId() != null ? request.getOrderId().trim().toUpperCase() : null)
                .category(request.getCategory())
                .subject(request.getSubject().trim())
                .message(request.getMessage().trim())
                .status(EnquiryStatus.OPEN)
                .build();

        enquiry = enquiryRepository.save(enquiry);
        log.info("[EnquiryService] New customer enquiry created with ticketId='{}'", ticketId);

        emailService.sendEnquiryConfirmation(enquiry);

        return EnquiryResponse.fromEntity(enquiry);
    }

    @Transactional(readOnly = true)
    public EnquiryResponse getEnquiryByTicketId(String ticketId) {
        CustomerEnquiry enquiry = enquiryRepository.findByTicketId(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("No inquiry found with ticket ID: " + ticketId));
        return EnquiryResponse.fromEntity(enquiry);
    }

    @Transactional(readOnly = true)
    public List<EnquiryResponse> getEnquiriesByEmail(String email) {
        return enquiryRepository.findByEmailOrderByCreatedAtDesc(email.trim().toLowerCase()).stream()
                .map(EnquiryResponse::fromEntity)
                .collect(Collectors.toList());
    }

    private String generateTicketId() {
        String datePart = LocalDate.now().format(DATE_FORMATTER);
        int randomPart = 1000 + RANDOM.nextInt(9000);
        return String.format("FIC-INQ-%s-%04d", datePart, randomPart);
    }
}
