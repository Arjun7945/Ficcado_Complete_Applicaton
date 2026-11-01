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
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final OtpRecordRepository otpRecordRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;
    private final FiccadoDataClient ficcadoDataClient;

    @Value("${ficcado.otp.expiry-minutes:10}")
    private int expiryMinutes;

    @Value("${ficcado.otp.max-attempts:5}")
    private int maxAttempts;

    @Value("${ficcado.otp.resend-cooldown-seconds:60}")
    private int cooldownSeconds;

    /**
     * Step 1: Request password reset OTP.
     * Response is always generic ("If an account exists, we sent a code") with identical timing class.
     */
    @Transactional
    public OtpGenerateResponse generateOtp(OtpGenerateRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        // 1. Rate-limiting check: 60s cooldown
        Instant cooldownThreshold = Instant.now().minus(Duration.ofSeconds(cooldownSeconds));
        List<OtpRecord> recentOtps = otpRecordRepository.findByEmailAndCreatedAtAfter(email, cooldownThreshold);
        if (!recentOtps.isEmpty()) {
            long secondsLeft = Duration.between(recentOtps.getFirst().getCreatedAt(), Instant.now()).toSeconds();
            long waitSeconds = Math.max(1, cooldownSeconds - secondsLeft);
            throw new OtpRateLimitException("Please wait " + waitSeconds + " seconds before requesting another code.");
        }

        // 2. Hourly rate-limiting check: max 5 requests per hour per email
        Instant oneHourAgo = Instant.now().minus(Duration.ofHours(1));
        long countLastHour = otpRecordRepository.countByEmailAndCreatedAtAfter(email, oneHourAgo);
        if (countLastHour >= 5) {
            throw new OtpRateLimitException("Maximum request limit reached for this hour. Please try again later.");
        }

        // 3. Generate 6-digit OTP and compute hash
        int code = 100000 + SECURE_RANDOM.nextInt(900000);
        String otpString = String.valueOf(code);
        String otpHash = hashOtp(otpString, email);

        // 4. Verify account existence in Ficcado-Data (CRM)
        boolean customerExists = ficcadoDataClient.checkCustomerExists(email);

        if (customerExists) {
            // Save OTP record
            Instant expiresAt = Instant.now().plus(Duration.ofMinutes(expiryMinutes));
            OtpRecord record = OtpRecord.builder()
                    .email(email)
                    .otpHash(otpHash)
                    .purpose(OtpPurpose.PASSWORD_RESET)
                    .attemptCount(0)
                    .maxAttempts(maxAttempts)
                    .verified(false)
                    .expiresAt(expiresAt)
                    .build();

            otpRecordRepository.save(record);

            // Dispatch OTP email via SMTP
            emailService.sendOtpEmail(email, otpString, OtpPurpose.PASSWORD_RESET);
            log.info("[OtpService] Password reset OTP dispatched for customer [email='{}']", email);
        } else {
            // Simulate identical hash calculation and log for constant timing class
            hashOtp(otpString, email + "_dummy_salt");
            log.info("[OtpService] Password reset requested for non-existing email='{}'", email);
        }

        return OtpGenerateResponse.builder()
                .email(email)
                .purpose(OtpPurpose.PASSWORD_RESET)
                .expiresInSeconds((long) expiryMinutes * 60)
                .message("If an account exists, we sent a code")
                .build();
    }

    /**
     * Step 2: Verify 6-digit OTP and return single-use reset token valid for 10 minutes.
     * All wrong, expired, or max-attempt codes return one generic error.
     */
    @Transactional
    public OtpVerifyResponse verifyOtp(OtpVerifyRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String enteredOtp = request.getOtp().trim();

        // 1. Find latest unverified OTP record
        Optional<OtpRecord> recordOpt = otpRecordRepository
                .findTopByEmailAndPurposeAndVerifiedFalseOrderByCreatedAtDesc(email, OtpPurpose.PASSWORD_RESET);

        if (recordOpt.isEmpty()) {
            throw new InvalidOtpException("Invalid or expired verification code.");
        }

        OtpRecord record = recordOpt.get();

        // 2. Max attempts check
        if (record.getAttemptCount() >= record.getMaxAttempts()) {
            throw new OtpMaxAttemptsException("Invalid or expired verification code.");
        }

        // 3. Expiry check
        if (Instant.now().isAfter(record.getExpiresAt())) {
            throw new OtpExpiredException("Invalid or expired verification code.");
        }

        // 4. Constant-time hash verification
        String enteredHash = hashOtp(enteredOtp, email);
        if (!MessageDigest.isEqual(enteredHash.getBytes(StandardCharsets.UTF_8), record.getOtpHash().getBytes(StandardCharsets.UTF_8))) {
            record.setAttemptCount(record.getAttemptCount() + 1);
            otpRecordRepository.save(record);
            if (record.getAttemptCount() >= record.getMaxAttempts()) {
                throw new OtpMaxAttemptsException("Invalid or expired verification code.");
            }
            throw new InvalidOtpException("Invalid or expired verification code.");
        }

        // 5. Consume OTP and create single-use reset token
        record.setVerified(true);
        record.setVerifiedAt(Instant.now());
        otpRecordRepository.save(record);

        String rawResetToken = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        String tokenHash = hashOtp(rawResetToken, email);

        PasswordResetToken resetTokenEntity = PasswordResetToken.builder()
                .email(email)
                .tokenHash(tokenHash)
                .expiresAt(Instant.now().plus(Duration.ofMinutes(10)))
                .consumed(false)
                .build();

        passwordResetTokenRepository.save(resetTokenEntity);
        log.info("[OtpService] OTP verified and single-use password reset token generated for email='{}'", email);

        return OtpVerifyResponse.builder()
                .verified(true)
                .email(email)
                .purpose(OtpPurpose.PASSWORD_RESET)
                .verificationToken(rawResetToken)
                .resetToken(rawResetToken)
                .message("Verification successful.")
                .build();
    }

    /**
     * Step 3: Set new password using single-use reset token.
     * Calls Ficcado-Data internal endpoint, updates BCrypt hash, sets emailVerifiedAt,
     * deletes all active sessions, and consumes the token.
     */
    @Transactional
    public String resetPassword(PasswordResetConfirmRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String resetToken = request.getResetToken().trim();
        String newPassword = request.getNewPassword();
        String confirmPassword = request.getConfirmPassword();

        // 1. Password validation
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Passwords do not match");
        }
        if (newPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }

        // 2. Validate reset token
        String tokenHash = hashOtp(resetToken, email);
        PasswordResetToken token = passwordResetTokenRepository
                .findByEmailAndTokenHashAndConsumedFalse(email, tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset token. Please request a new code."));

        if (Instant.now().isAfter(token.getExpiresAt())) {
            throw new IllegalArgumentException("Reset token has expired. Please request a new code.");
        }

        // 3. Consume token
        token.setConsumed(true);
        token.setConsumedAt(Instant.now());
        passwordResetTokenRepository.save(token);

        // 4. Internal handshake with Ficcado-Data to update password & invalidate sessions
        boolean success = ficcadoDataClient.resetCustomerPassword(email, newPassword);
        if (!success) {
            log.error("[OtpService] Failed to reset customer password in Ficcado-Data for email='{}'", email);
            throw new IllegalStateException("Could not update password. Please try again.");
        }

        log.info("[OtpService] Password successfully reset for customer email='{}'", email);
        return "Password updated. Please sign in.";
    }

    private String hashOtp(String value, String salt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(salt.getBytes(StandardCharsets.UTF_8));
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
