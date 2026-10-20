package com.aps.ficcado_website_data.controller;

import com.aps.ficcado_website_data.dto.ApiResponse;
import com.aps.ficcado_website_data.dto.EnquiryRequest;
import com.aps.ficcado_website_data.dto.EnquiryResponse;
import com.aps.ficcado_website_data.service.EnquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/enquiries")
@RequiredArgsConstructor
public class EnquiryController {

    private final EnquiryService enquiryService;

    @PostMapping
    public ResponseEntity<ApiResponse<EnquiryResponse>> createEnquiry(@Valid @RequestBody EnquiryRequest request) {
        EnquiryResponse response = enquiryService.createEnquiry(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Enquiry submitted successfully. Ticket ID: " + response.getTicketId()));
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<ApiResponse<EnquiryResponse>> getEnquiryByTicketId(@PathVariable String ticketId) {
        EnquiryResponse response = enquiryService.getEnquiryByTicketId(ticketId);
        return ResponseEntity.ok(ApiResponse.success(response, "Enquiry details retrieved successfully."));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<EnquiryResponse>>> getEnquiriesByEmail(@RequestParam String email) {
        List<EnquiryResponse> response = enquiryService.getEnquiriesByEmail(email);
        return ResponseEntity.ok(ApiResponse.success(response, "Enquiries retrieved successfully."));
    }
}
