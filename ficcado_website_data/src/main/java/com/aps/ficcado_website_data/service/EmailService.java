package com.aps.ficcado_website_data.service;

import com.aps.ficcado_website_data.entity.CustomerComplaint;
import com.aps.ficcado_website_data.entity.CustomerEnquiry;
import com.aps.ficcado_website_data.entity.SupportEmail;
import com.aps.ficcado_website_data.entity.enums.EmailStatus;
import com.aps.ficcado_website_data.entity.enums.EmailType;
import com.aps.ficcado_website_data.entity.enums.OtpPurpose;
import com.aps.ficcado_website_data.repository.SupportEmailRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final SupportEmailRepository supportEmailRepository;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${ficcado.mail.from:support@ficcado.in}")
    private String fromEmail;

    @Value("${ficcado.mail.enabled:false}")
    private boolean mailEnabled;

    @Async
    public void sendEmail(String to, String subject, String bodyText, String bodyHtml, EmailType emailType) {
        SupportEmail emailLog = SupportEmail.builder()
                .recipientEmail(to)
                .senderEmail(fromEmail)
                .subject(subject)
                .bodyText(bodyText)
                .bodyHtml(bodyHtml)
                .emailType(emailType)
                .status(EmailStatus.PENDING)
                .build();

        emailLog = supportEmailRepository.save(emailLog);

        if (!mailEnabled || mailSender == null) {
            log.info("[EmailService] SMTP disabled or not configured. Simulated email to '{}' with subject '{}' logged in DB.", to, subject);
            emailLog.setStatus(EmailStatus.SENT);
            emailLog.setSentAt(Instant.now());
            supportEmailRepository.save(emailLog);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);

            if (bodyHtml != null && !bodyHtml.isBlank()) {
                helper.setText(bodyText != null ? bodyText : bodyHtml, bodyHtml);
            } else {
                helper.setText(bodyText != null ? bodyText : "", false);
            }

            mailSender.send(message);
            emailLog.setStatus(EmailStatus.SENT);
            emailLog.setSentAt(Instant.now());
            log.info("[EmailService] Successfully sent email to '{}' [type={}]", to, emailType);
        } catch (Exception ex) {
            log.error("[EmailService] Failed to send email to '{}': {}", to, ex.getMessage(), ex);
            emailLog.setStatus(EmailStatus.FAILED);
            emailLog.setErrorMessage(ex.getMessage());
        }

        supportEmailRepository.save(emailLog);
    }

    public void sendOtpEmail(String to, String otp, OtpPurpose purpose) {
        String subject = "Your Ficcado Security Code: " + otp;
        String purposeDescription = switch (purpose) {
            case CUSTOMER_LOGIN -> "sign in to your Ficcado customer account";
            case CUSTOMER_SIGNUP -> "complete your Ficcado account registration";
            case EMAIL_VERIFICATION -> "verify your email address";
        };

        String bodyText = String.format(
                "Hello,\n\nYour one-time security code is %s to %s.\n\n" +
                "This code is valid for 10 minutes. For your security, never share this code with anyone.\n\n" +
                "— Ficcado Clothing Team",
                otp, purposeDescription
        );

        String bodyHtml = String.format(
                "<div style=\"font-family: Arial, sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;\">" +
                "<h2 style=\"color: #111827; margin-bottom: 16px;\">Ficcado Security Code</h2>" +
                "<p style=\"color: #4b5563; font-size: 15px;\">Use the one-time code below to %s:</p>" +
                "<div style=\"background-color: #f3f4f6; padding: 16px; text-align: center; border-radius: 6px; margin: 20px 0;\">" +
                "<span style=\"font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #111827;\">%s</span>" +
                "</div>" +
                "<p style=\"color: #6b7280; font-size: 13px;\">This code expires in 10 minutes. If you did not request this, please disregard this email.</p>" +
                "<hr style=\"border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;\"/>" +
                "<p style=\"color: #9ca3af; font-size: 12px;\">© Ficcado Clothing. Timeless clothing & honest design.</p>" +
                "</div>",
                purposeDescription, otp
        );

        sendEmail(to, subject, bodyText, bodyHtml, EmailType.OTP);
    }

    public void sendEnquiryConfirmation(CustomerEnquiry enquiry) {
        String subject = "Support Ticket Created: " + enquiry.getTicketId();
        String bodyText = String.format(
                "Hello %s,\n\nWe have received your support inquiry (Ticket ID: %s).\n\n" +
                "Topic: %s\nSubject: %s\n\nOur operations team will review your message and respond shortly.\n\n" +
                "— Ficcado Support Desk",
                enquiry.getFullName(), enquiry.getTicketId(), enquiry.getCategory(), enquiry.getSubject()
        );

        sendEmail(enquiry.getEmail(), subject, bodyText, null, EmailType.ENQUIRY_CONFIRMATION);
    }

    public void sendComplaintConfirmation(CustomerComplaint complaint) {
        String subject = "Complaint Registered: " + complaint.getComplaintId();
        String bodyText = String.format(
                "Hello,\n\nYour complaint has been registered with ID: %s.\n\n" +
                "Type: %s\nStatus: SUBMITTED\n\nOur quality and logistics team is reviewing your report.\n\n" +
                "— Ficcado Customer Care",
                complaint.getComplaintId(), complaint.getComplaintType()
        );

        sendEmail(complaint.getCustomerEmail(), subject, bodyText, null, EmailType.COMPLAINT_UPDATE);
    }
}
