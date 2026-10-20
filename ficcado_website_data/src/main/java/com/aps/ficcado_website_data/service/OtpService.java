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
    private final EmailService emailService;

    @Value("${ficcado.otp.expiry-minutes:10}")
    private int expiryMinutes;

    @Value("${ficcado.otp.max-attempts:5}")
    private int maxAttempts;

    @Value("${ficcado.otp.resend-cooldown-seconds:60}")
    private int cooldownSeconds;

    @Transactional
    public OtpGenerateResponse generateOtp(OtpGenerateRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        OtpPurpose purpose = request.getPurpose();

        // 1. Rate-limiting check: has an OTP been generated within cooldown seconds?
        Instant cooldownThreshold = Instant.now().minus(Duration.ofSeconds(cooldownSeconds));
        List<OtpRecord> recentOtps = otpRecordRepository.findByEmailAndCreatedAtAfter(email, cooldownThreshold);
        if (!recentOtps.isEmpty()) {
            long secondsLeft = Duration.between(recentOtps.getFirst().getCreatedAt(), Instant.now()).toSeconds();
            long waitSeconds = Math.max(1, cooldownSeconds - secondsLeft);
            throw new OtpRateLimitException("Please wait " + waitSeconds + " seconds before requesting another code.");
        }

        // 2. Cryptographic 6-digit OTP generation
        int code = 100000 + SECURE_RANDOM.nextInt(900000);
        String otpString = String.valueOf(code);

        // 3. Hash OTP with SHA-256
        String otpHash = hashOtp(otpString, email);

        // 4. Save record
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(expiryMinutes));
        OtpRecord record = OtpRecord.builder()
                .email(email)
                .otpHash(otpHash)
                .purpose(purpose)
                .attemptCount(0)
                .maxAttempts(maxAttempts)
                .verified(false)
                .expiresAt(expiresAt)
                .build();

        otpRecordRepository.save(record);

        // 5. Dispatch email via EmailService
        emailService.sendOtpEmail(email, otpString, purpose);

        log.info("[OtpService] OTP generated and dispatched for email='{}', purpose={}", email, purpose);

        return OtpGenerateResponse.builder()
                .email(email)
                .purpose(purpose)
                .expiresInSeconds((long) expiryMinutes * 60)
                .message("Verification code has been sent to your email address.")
                .build();
    }

    @Transactional
    public OtpVerifyResponse verifyOtp(OtpVerifyRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String enteredOtp = request.getOtp().trim();
        OtpPurpose purpose = request.getPurpose();

        // 1. Find the latest unverified OTP record for this email and purpose
        Optional<OtpRecord> recordOpt = otpRecordRepository
                .findTopByEmailAndPurposeAndVerifiedFalseOrderByCreatedAtDesc(email, purpose);

        if (recordOpt.isEmpty()) {
            throw new InvalidOtpException("No active verification code found for this email. Please request a new one.");
        }

        OtpRecord record = recordOpt.get();

        // 2. Check if maximum attempts exceeded
        if (record.getAttemptCount() >= record.getMaxAttempts()) {
            throw new OtpMaxAttemptsException("Maximum verification attempts exceeded. Please request a new code.");
        }

        // 3. Check expiration
        if (Instant.now().isAfter(record.getExpiresAt())) {
            throw new OtpExpiredException("Verification code has expired. Please request a new one.");
        }

        // 4. Verify hash
        String enteredHash = hashOtp(enteredOtp, email);
        if (!MessageDigest.isEqual(enteredHash.getBytes(StandardCharsets.UTF_8), record.getOtpHash().getBytes(StandardCharsets.UTF_8))) {
            record.setAttemptCount(record.getAttemptCount() + 1);
            otpRecordRepository.save(record);
            int attemptsRemaining = record.getMaxAttempts() - record.getAttemptCount();
            if (attemptsRemaining <= 0) {
                throw new OtpMaxAttemptsException("Incorrect code. Maximum attempts reached. Please request a new code.");
            }
            throw new InvalidOtpException("Incorrect verification code. " + attemptsRemaining + " attempts remaining.");
        }

        // 5. Successful verification
        record.setVerified(true);
        record.setVerifiedAt(Instant.now());
        otpRecordRepository.save(record);

        // Generate one-time secure verification token for subsequent auth workflows
        String verificationToken = UUID.randomUUID().toString();

        log.info("[OtpService] OTP successfully verified for email='{}', purpose={}", email, purpose);

        return OtpVerifyResponse.builder()
                .verified(true)
                .email(email)
                .purpose(purpose)
                .verificationToken(verificationToken)
                .message("Verification successful.")
                .build();
    }

    private String hashOtp(String otp, String salt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(salt.getBytes(StandardCharsets.UTF_8));
            byte[] hash = digest.digest(otp.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
