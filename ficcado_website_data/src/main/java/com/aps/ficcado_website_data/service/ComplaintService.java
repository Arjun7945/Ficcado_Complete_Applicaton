package com.aps.ficcado_website_data.service;

import com.aps.ficcado_website_data.dto.ComplaintRequest;
import com.aps.ficcado_website_data.dto.ComplaintResponse;
import com.aps.ficcado_website_data.entity.CustomerComplaint;
import com.aps.ficcado_website_data.entity.enums.ComplaintStatus;
import com.aps.ficcado_website_data.exception.ResourceNotFoundException;
import com.aps.ficcado_website_data.repository.ComplaintRepository;
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
public class ComplaintService {

    private static final Logger log = LoggerFactory.getLogger(ComplaintService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final ComplaintRepository complaintRepository;
    private final EmailService emailService;

    @Transactional
    public ComplaintResponse createComplaint(ComplaintRequest request) {
        String complaintId = generateComplaintId();

        CustomerComplaint complaint = CustomerComplaint.builder()
                .complaintId(complaintId)
                .customerEmail(request.getCustomerEmail().trim().toLowerCase())
                .customerPhone(request.getCustomerPhone() != null ? request.getCustomerPhone().trim() : null)
                .orderId(request.getOrderId() != null ? request.getOrderId().trim().toUpperCase() : null)
                .complaintType(request.getComplaintType())
                .description(request.getDescription().trim())
                .status(ComplaintStatus.SUBMITTED)
                .build();

        complaint = complaintRepository.save(complaint);
        log.info("[ComplaintService] New complaint registered with complaintId='{}'", complaintId);

        emailService.sendComplaintConfirmation(complaint);

        return ComplaintResponse.fromEntity(complaint);
    }

    @Transactional(readOnly = true)
    public ComplaintResponse getComplaintById(String complaintId) {
        CustomerComplaint complaint = complaintRepository.findByComplaintId(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("No complaint found with ID: " + complaintId));
        return ComplaintResponse.fromEntity(complaint);
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponse> getComplaintsByEmail(String email) {
        return complaintRepository.findByCustomerEmailOrderByCreatedAtDesc(email.trim().toLowerCase()).stream()
                .map(ComplaintResponse::fromEntity)
                .collect(Collectors.toList());
    }

    private String generateComplaintId() {
        String datePart = LocalDate.now().format(DATE_FORMATTER);
        int randomPart = 1000 + RANDOM.nextInt(9000);
        return String.format("FIC-CMP-%s-%04d", datePart, randomPart);
    }
}
