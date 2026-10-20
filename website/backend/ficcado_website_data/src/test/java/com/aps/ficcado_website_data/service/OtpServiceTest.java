package com.aps.ficcado_website_data.service;

import com.aps.ficcado_website_data.dto.OtpGenerateRequest;
import com.aps.ficcado_website_data.dto.OtpGenerateResponse;
import com.aps.ficcado_website_data.dto.OtpVerifyRequest;
import com.aps.ficcado_website_data.dto.OtpVerifyResponse;
import com.aps.ficcado_website_data.entity.OtpRecord;
import com.aps.ficcado_website_data.entity.enums.OtpPurpose;
import com.aps.ficcado_website_data.exception.InvalidOtpException;
import com.aps.ficcado_website_data.exception.OtpExpiredException;
import com.aps.ficcado_website_data.exception.OtpMaxAttemptsException;
import com.aps.ficcado_website_data.exception.OtpRateLimitException;
import com.aps.ficcado_website_data.repository.OtpRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    @Mock
    private OtpRecordRepository otpRecordRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private com.aps.ficcado_website_data.client.FiccadoDataClient ficcadoDataClient;

    @InjectMocks
    private OtpService otpService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(otpService, "expiryMinutes", 10);
        ReflectionTestUtils.setField(otpService, "maxAttempts", 5);
        ReflectionTestUtils.setField(otpService, "cooldownSeconds", 60);
    }

    @Test
    void testGenerateOtp_Success() {
        String email = "customer@ficcado.in";
        OtpGenerateRequest request = OtpGenerateRequest.builder()
                .email(email)
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .build();

        when(otpRecordRepository.findByEmailAndCreatedAtAfter(eq(email), any(Instant.class)))
                .thenReturn(Collections.emptyList());

        ArgumentCaptor<OtpRecord> recordCaptor = ArgumentCaptor.forClass(OtpRecord.class);
        when(otpRecordRepository.save(recordCaptor.capture())).thenAnswer(invocation -> invocation.getArgument(0));

        OtpGenerateResponse response = otpService.generateOtp(request);

        assertNotNull(response);
        assertEquals(email, response.getEmail());
        assertEquals(OtpPurpose.CUSTOMER_LOGIN, response.getPurpose());
        assertEquals(600, response.getExpiresInSeconds());

        OtpRecord saved = recordCaptor.getValue();
        assertEquals(email, saved.getEmail());
        assertEquals(OtpPurpose.CUSTOMER_LOGIN, saved.getPurpose());
        assertNotNull(saved.getOtpHash());
        assertFalse(saved.isVerified());

        verify(emailService, times(1)).sendOtpEmail(eq(email), anyString(), eq(OtpPurpose.CUSTOMER_LOGIN));
    }

    @Test
    void testGenerateOtp_RateLimitExceeded() {
        String email = "customer@ficcado.in";
        OtpGenerateRequest request = OtpGenerateRequest.builder()
                .email(email)
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .build();

        OtpRecord recent = OtpRecord.builder()
                .email(email)
                .createdAt(Instant.now().minusSeconds(10))
                .build();

        when(otpRecordRepository.findByEmailAndCreatedAtAfter(eq(email), any(Instant.class)))
                .thenReturn(List.of(recent));

        assertThrows(OtpRateLimitException.class, () -> otpService.generateOtp(request));
        verify(emailService, never()).sendOtpEmail(any(), any(), any());
    }

    @Test
    void testVerifyOtp_Success() {
        String email = "customer@ficcado.in";
        String plainOtp = "123456";
        String otpHash = hash(plainOtp, email);

        OtpRecord record = OtpRecord.builder()
                .email(email)
                .otpHash(otpHash)
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .attemptCount(0)
                .maxAttempts(5)
                .verified(false)
                .expiresAt(Instant.now().plusSeconds(300))
                .build();

        when(otpRecordRepository.findTopByEmailAndPurposeAndVerifiedFalseOrderByCreatedAtDesc(email, OtpPurpose.CUSTOMER_LOGIN))
                .thenReturn(Optional.of(record));

        OtpVerifyRequest request = OtpVerifyRequest.builder()
                .email(email)
                .otp(plainOtp)
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .build();

        OtpVerifyResponse response = otpService.verifyOtp(request);

        assertTrue(response.isVerified());
        assertNotNull(response.getVerificationToken());
        assertTrue(record.isVerified());
        assertNotNull(record.getVerifiedAt());

        verify(otpRecordRepository, times(1)).save(record);
    }

    @Test
    void testVerifyOtp_IncorrectCode_IncrementsAttempts() {
        String email = "customer@ficcado.in";
        String otpHash = hash("123456", email);

        OtpRecord record = OtpRecord.builder()
                .email(email)
                .otpHash(otpHash)
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .attemptCount(0)
                .maxAttempts(5)
                .verified(false)
                .expiresAt(Instant.now().plusSeconds(300))
                .build();

        when(otpRecordRepository.findTopByEmailAndPurposeAndVerifiedFalseOrderByCreatedAtDesc(email, OtpPurpose.CUSTOMER_LOGIN))
                .thenReturn(Optional.of(record));

        OtpVerifyRequest request = OtpVerifyRequest.builder()
                .email(email)
                .otp("999999")
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .build();

        assertThrows(InvalidOtpException.class, () -> otpService.verifyOtp(request));
        assertEquals(1, record.getAttemptCount());
        assertFalse(record.isVerified());

        verify(otpRecordRepository, times(1)).save(record);
    }

    @Test
    void testVerifyOtp_MaxAttemptsExceeded() {
        String email = "customer@ficcado.in";
        OtpRecord record = OtpRecord.builder()
                .email(email)
                .otpHash(hash("123456", email))
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .attemptCount(5)
                .maxAttempts(5)
                .verified(false)
                .expiresAt(Instant.now().plusSeconds(300))
                .build();

        when(otpRecordRepository.findTopByEmailAndPurposeAndVerifiedFalseOrderByCreatedAtDesc(email, OtpPurpose.CUSTOMER_LOGIN))
                .thenReturn(Optional.of(record));

        OtpVerifyRequest request = OtpVerifyRequest.builder()
                .email(email)
                .otp("123456")
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .build();

        assertThrows(OtpMaxAttemptsException.class, () -> otpService.verifyOtp(request));
    }

    @Test
    void testVerifyOtp_Expired() {
        String email = "customer@ficcado.in";
        OtpRecord record = OtpRecord.builder()
                .email(email)
                .otpHash(hash("123456", email))
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .attemptCount(0)
                .maxAttempts(5)
                .verified(false)
                .expiresAt(Instant.now().minusSeconds(10))
                .build();

        when(otpRecordRepository.findTopByEmailAndPurposeAndVerifiedFalseOrderByCreatedAtDesc(email, OtpPurpose.CUSTOMER_LOGIN))
                .thenReturn(Optional.of(record));

        OtpVerifyRequest request = OtpVerifyRequest.builder()
                .email(email)
                .otp("123456")
                .purpose(OtpPurpose.CUSTOMER_LOGIN)
                .build();

        assertThrows(OtpExpiredException.class, () -> otpService.verifyOtp(request));
    }

    private String hash(String otp, String salt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(salt.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(digest.digest(otp.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
