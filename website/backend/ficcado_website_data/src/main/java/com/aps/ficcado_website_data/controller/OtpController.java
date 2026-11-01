package com.aps.ficcado_website_data.controller;

import com.aps.ficcado_website_data.dto.*;
import com.aps.ficcado_website_data.service.OtpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/otp")
@RequiredArgsConstructor
public class OtpController {

    private final OtpService otpService;

    @PostMapping({"/generate", "/forgot-password/request"})
    public ResponseEntity<ApiResponse<OtpGenerateResponse>> generateOtp(@Valid @RequestBody OtpGenerateRequest request) {
        OtpGenerateResponse response = otpService.generateOtp(request);
        return ResponseEntity.ok(ApiResponse.success(response, response.getMessage()));
    }

    @PostMapping({"/verify", "/forgot-password/verify"})
    public ResponseEntity<ApiResponse<OtpVerifyResponse>> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        OtpVerifyResponse response = otpService.verifyOtp(request);
        return ResponseEntity.ok(ApiResponse.success(response, response.getMessage()));
    }

    @PostMapping({"/reset-password", "/forgot-password/reset"})
    public ResponseEntity<ApiResponse<Map<String, String>>> resetPassword(@Valid @RequestBody PasswordResetConfirmRequest request) {
        String message = otpService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", message), message));
    }
}
