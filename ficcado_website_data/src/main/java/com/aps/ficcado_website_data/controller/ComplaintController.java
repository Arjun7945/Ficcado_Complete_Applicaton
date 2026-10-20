package com.aps.ficcado_website_data.controller;

import com.aps.ficcado_website_data.dto.ApiResponse;
import com.aps.ficcado_website_data.dto.ComplaintRequest;
import com.aps.ficcado_website_data.dto.ComplaintResponse;
import com.aps.ficcado_website_data.service.ComplaintService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintService complaintService;

    @PostMapping
    public ResponseEntity<ApiResponse<ComplaintResponse>> createComplaint(@Valid @RequestBody ComplaintRequest request) {
        ComplaintResponse response = complaintService.createComplaint(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Complaint registered successfully. Complaint ID: " + response.getComplaintId()));
    }

    @GetMapping("/{complaintId}")
    public ResponseEntity<ApiResponse<ComplaintResponse>> getComplaintById(@PathVariable String complaintId) {
        ComplaintResponse response = complaintService.getComplaintById(complaintId);
        return ResponseEntity.ok(ApiResponse.success(response, "Complaint details retrieved successfully."));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ComplaintResponse>>> getComplaintsByEmail(@RequestParam String email) {
        List<ComplaintResponse> response = complaintService.getComplaintsByEmail(email);
        return ResponseEntity.ok(ApiResponse.success(response, "Complaints retrieved successfully."));
    }
}
