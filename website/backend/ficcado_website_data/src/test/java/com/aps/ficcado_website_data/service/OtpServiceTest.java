package com.aps.ficcado_website_data.service;

import com.aps.ficcado_website_data.client.FiccadoDataClient;
import com.aps.ficcado_website_data.dto.*;
import com.aps.ficcado_website_data.entity.OtpRecord;
import com.aps.ficcado_website_data.entity.PasswordResetToken;
import com.aps.ficcado_website_data.entity.enums.OtpPurpose;
import com.aps.ficcado_website_data.exception.InvalidOtpException;
import com.aps.ficcado_website_data.exception.OtpExpiredException;
import com.aps.ficcado_website_data.exception.OtpMaxAttemptsException;
import com.aps.ficcado_website_data.exception.OtpRateLimitException;
import com.aps.ficcado_website_data.repository.OtpRecordRepository;
import com.aps.ficcado_website_data.repository.PasswordResetTokenRepository;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    @Mock
    private OtpRecordRepository otpRecordRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private FiccadoDataClient ficcadoDataClient;

    @InjectMocks
    private OtpService otpService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(otpService, "expiryMinutes", 10);
        ReflectionTestUtils.setField(otpService, "maxAttempts", 5);
        ReflectionTestUtils.setField(otpService, "cooldownSeconds", 60);
    }

    @Test
    void testGenerateOtp_CustomerExists_SendsEmailAndReturnsGenericSuccess() {
        String email = "customer@ficcado.in";
        OtpGenerateRequest request = OtpGenerateRequest.builder()
                .email(email)
                .purpose(OtpPurpose.PASSWORD_RESET)
                .build();

        when(otpRecordRepository.findByEmailAndCreatedAtAfter(eq(email), any(Instant.class)))
                .thenReturn(Collections.emptyList());
        when(otpRecordRepository.countByEmailAndCreatedAtAfter(eq(email), any(Instant.class)))
                .thenReturn(0L);
        when(ficcadoDataClient.checkCustomerExists(email)).thenReturn(true);

        ArgumentCaptor<OtpRecord> recordCaptor = ArgumentCaptor.forClass(OtpRecord.class);
        when(otpRecordRepository.save(recordCaptor.capture())).thenAnswer(invocation -> invocation.getArgument(0));

        OtpGenerateResponse response = otpService.generateOtp(request);

        assertNotNull(response);
        assertEquals(email, response.getEmail());
        assertEquals(OtpPurpose.PASSWORD_RESET, response.getPurpose());
        assertEquals(600, response.getExpiresInSeconds());
        assertEquals("If an account exists, we sent a code", response.getMessage());

        OtpRecord saved = recordCaptor.getValue();
        assertEquals(email, saved.getEmail());
        assertEquals(OtpPurpose.PASSWORD_RESET, saved.getPurpose());
        assertNotNull(saved.getOtpHash());
        assertFalse(saved.isVerified());

        verify(emailService, times(1)).sendOtpEmail(eq(email), anyString(), eq(OtpPurpose.PASSWORD_RESET));
    }

    @Test
    void testGenerateOtp_CustomerDoesNotExist_ReturnsGenericSuccessWithoutEmail() {
        String email = "unknown@ficcado.in";
        OtpGenerateRequest request = OtpGenerateRequest.builder()
                .email(email)
                .purpose(OtpPurpose.PASSWORD_RESET)
                .build();

        when(otpRecordRepository.findByEmailAndCreatedAtAfter(eq(email), any(Instant.class)))
                .thenReturn(Collections.emptyList());
        when(otpRecordRepository.countByEmailAndCreatedAtAfter(eq(email), any(Instant.class)))
                .thenReturn(0L);
        when(ficcadoDataClient.checkCustomerExists(email)).thenReturn(false);

        OtpGenerateResponse response = otpService.generateOtp(request);

        assertNotNull(response);
        assertEquals(email, response.getEmail());
        assertEquals("If an account exists, we sent a code", response.getMessage());

        verify(otpRecordRepository, never()).save(any());
        verify(emailService, never()).sendOtpEmail(any(), any(), any());
    }

    @Test
    void testGenerateOtp_RateLimitCooldown() {
        String email = "customer@ficcado.in";
        OtpGenerateRequest request = OtpGenerateRequest.builder()
                .email(email)
                .purpose(OtpPurpose.PASSWORD_RESET)
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
    void testGenerateOtp_HourlyRateLimitExceeded() {
        String email = "customer@ficcado.in";
        OtpGenerateRequest request = OtpGenerateRequest.builder()
                .email(email)
                .purpose(OtpPurpose.PASSWORD_RESET)
                .build();

        when(otpRecordRepository.findByEmailAndCreatedAtAfter(eq(email), any(Instant.class)))
                .thenReturn(Collections.emptyList());
        when(otpRecordRepository.countByEmailAndCreatedAtAfter(eq(email), any(Instant.class)))
                .thenReturn(5L);

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
                .purpose(OtpPurpose.PASSWORD_RESET)
                .attemptCount(0)
                .maxAttempts(5)
                .verified(false)
                .expiresAt(Instant.now().plusSeconds(300))
                .build();

        when(otpRecordRepository.findTopByEmailAndPurposeAndVerifiedFalseOrderByCreatedAtDesc(email, OtpPurpose.PASSWORD_RESET))
                .thenReturn(Optional.of(record));

        OtpVerifyRequest request = OtpVerifyRequest.builder()
                .email(email)
                .otp(plainOtp)
                .purpose(OtpPurpose.PASSWORD_RESET)
                .build();

        OtpVerifyResponse response = otpService.verifyOtp(request);

        assertTrue(response.isVerified());
        assertNotNull(response.getResetToken());
        assertTrue(record.isVerified());
        assertNotNull(record.getVerifiedAt());

        verify(otpRecordRepository, times(1)).save(record);
        verify(passwordResetTokenRepository, times(1)).save(any(PasswordResetToken.class));
    }

    @Test
    void testVerifyOtp_IncorrectCode_IncrementsAttempts() {
        String email = "customer@ficcado.in";
        String otpHash = hash("123456", email);

        OtpRecord record = OtpRecord.builder()
                .email(email)
                .otpHash(otpHash)
                .purpose(OtpPurpose.PASSWORD_RESET)
                .attemptCount(0)
                .maxAttempts(5)
                .verified(false)
                .expiresAt(Instant.now().plusSeconds(300))
                .build();

        when(otpRecordRepository.findTopByEmailAndPurposeAndVerifiedFalseOrderByCreatedAtDesc(email, OtpPurpose.PASSWORD_RESET))
                .thenReturn(Optional.of(record));

        OtpVerifyRequest request = OtpVerifyRequest.builder()
                .email(email)
                .otp("999999")
                .purpose(OtpPurpose.PASSWORD_RESET)
                .build();

        assertThrows(InvalidOtpException.class, () -> otpService.verifyOtp(request));
        assertEquals(1, record.getAttemptCount());
        assertFalse(record.isVerified());

        verify(otpRecordRepository, times(1)).save(record);
        verify(passwordResetTokenRepository, never()).save(any());
    }

    @Test
    void testVerifyOtp_MaxAttemptsExceeded() {
        String email = "customer@ficcado.in";
        OtpRecord record = OtpRecord.builder()
                .email(email)
                .otpHash(hash("123456", email))
                .purpose(OtpPurpose.PASSWORD_RESET)
                .attemptCount(5)
                .maxAttempts(5)
                .verified(false)
                .expiresAt(Instant.now().plusSeconds(300))
                .build();

        when(otpRecordRepository.findTopByEmailAndPurposeAndVerifiedFalseOrderByCreatedAtDesc(email, OtpPurpose.PASSWORD_RESET))
                .thenReturn(Optional.of(record));

        OtpVerifyRequest request = OtpVerifyRequest.builder()
                .email(email)
                .otp("123456")
                .purpose(OtpPurpose.PASSWORD_RESET)
                .build();

        assertThrows(OtpMaxAttemptsException.class, () -> otpService.verifyOtp(request));
    }

    @Test
    void testVerifyOtp_Expired() {
        String email = "customer@ficcado.in";
        OtpRecord record = OtpRecord.builder()
                .email(email)
                .otpHash(hash("123456", email))
                .purpose(OtpPurpose.PASSWORD_RESET)
                .attemptCount(0)
                .maxAttempts(5)
                .verified(false)
                .expiresAt(Instant.now().minusSeconds(10))
                .build();

        when(otpRecordRepository.findTopByEmailAndPurposeAndVerifiedFalseOrderByCreatedAtDesc(email, OtpPurpose.PASSWORD_RESET))
                .thenReturn(Optional.of(record));

        OtpVerifyRequest request = OtpVerifyRequest.builder()
                .email(email)
                .otp("123456")
                .purpose(OtpPurpose.PASSWORD_RESET)
                .build();

        assertThrows(OtpExpiredException.class, () -> otpService.verifyOtp(request));
    }

    @Test
    void testResetPassword_Success() {
        String email = "customer@ficcado.in";
        String rawToken = "sample-valid-reset-token";
        String tokenHash = hash(rawToken, email);

        PasswordResetToken token = PasswordResetToken.builder()
                .email(email)
                .tokenHash(tokenHash)
                .expiresAt(Instant.now().plusSeconds(600))
                .consumed(false)
                .build();

        when(passwordResetTokenRepository.findByEmailAndTokenHashAndConsumedFalse(email, tokenHash))
                .thenReturn(Optional.of(token));
        when(ficcadoDataClient.resetCustomerPassword(email, "NewSecretPass123")).thenReturn(true);

        PasswordResetConfirmRequest request = PasswordResetConfirmRequest.builder()
                .email(email)
                .resetToken(rawToken)
                .newPassword("NewSecretPass123")
                .confirmPassword("NewSecretPass123")
                .build();

        String result = otpService.resetPassword(request);

        assertEquals("Password updated. Please sign in.", result);
        assertTrue(token.isConsumed());
        assertNotNull(token.getConsumedAt());
        verify(passwordResetTokenRepository, times(1)).save(token);
        verify(ficcadoDataClient, times(1)).resetCustomerPassword(email, "NewSecretPass123");
    }

    @Test
    void testResetPassword_PasswordMismatch() {
        PasswordResetConfirmRequest request = PasswordResetConfirmRequest.builder()
                .email("customer@ficcado.in")
                .resetToken("sample-token")
                .newPassword("NewSecretPass123")
                .confirmPassword("DifferentPass456")
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> otpService.resetPassword(request));
        assertEquals("Passwords do not match", ex.getMessage());
        verify(ficcadoDataClient, never()).resetCustomerPassword(any(), any());
    }

    @Test
    void testResetPassword_PasswordTooShort() {
        PasswordResetConfirmRequest request = PasswordResetConfirmRequest.builder()
                .email("customer@ficcado.in")
                .resetToken("sample-token")
                .newPassword("12345")
                .confirmPassword("12345")
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> otpService.resetPassword(request));
        assertEquals("Password must be at least 6 characters", ex.getMessage());
        verify(ficcadoDataClient, never()).resetCustomerPassword(any(), any());
    }

    @Test
    void testResetPassword_InvalidToken() {
        String email = "customer@ficcado.in";
        String rawToken = "invalid-token";
        String tokenHash = hash(rawToken, email);

        when(passwordResetTokenRepository.findByEmailAndTokenHashAndConsumedFalse(email, tokenHash))
                .thenReturn(Optional.empty());

        PasswordResetConfirmRequest request = PasswordResetConfirmRequest.builder()
                .email(email)
                .resetToken(rawToken)
                .newPassword("NewSecretPass123")
                .confirmPassword("NewSecretPass123")
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> otpService.resetPassword(request));
        assertTrue(ex.getMessage().contains("Invalid or expired reset token"));
        verify(ficcadoDataClient, never()).resetCustomerPassword(any(), any());
    }

    private String hash(String value, String salt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(salt.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
