package com.aps.ficcado_website_data.controller;

import com.aps.ficcado_website_data.dto.ApiResponse;
import com.aps.ficcado_website_data.dto.OtpGenerateRequest;
import com.aps.ficcado_website_data.dto.OtpGenerateResponse;
import com.aps.ficcado_website_data.dto.OtpVerifyRequest;
import com.aps.ficcado_website_data.dto.OtpVerifyResponse;
import com.aps.ficcado_website_data.service.OtpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/otp")
@RequiredArgsConstructor
public class OtpController {

    private final OtpService otpService;

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<OtpGenerateResponse>> generateOtp(@Valid @RequestBody OtpGenerateRequest request) {
        OtpGenerateResponse response = otpService.generateOtp(request);
        return ResponseEntity.ok(ApiResponse.success(response, response.getMessage()));
    }

    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<OtpVerifyResponse>> verifyOtp(
            @Valid @RequestBody OtpVerifyRequest request,
            HttpServletRequest httpRequest) {
        OtpVerifyResponse response = otpService.verifyOtp(request);
        var builder = ResponseEntity.ok();
        if (response.getCustomerToken() != null && !response.getCustomerToken().isBlank()) {
            ResponseCookie cookie = ResponseCookie.from("ficcado_customer_session", response.getCustomerToken())
                    .httpOnly(true)
                    .path("/")
                    .sameSite("Lax")
                    .secure(httpRequest.isSecure())
                    .build();
            builder.header(HttpHeaders.SET_COOKIE, cookie.toString());
        }
        return builder.body(ApiResponse.success(response, response.getMessage()));
    }
}
