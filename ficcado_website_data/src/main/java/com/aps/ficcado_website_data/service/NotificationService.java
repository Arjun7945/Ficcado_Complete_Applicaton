package com.aps.ficcado_website_data.service;

import com.aps.ficcado_website_data.dto.DropNotificationRequest;
import com.aps.ficcado_website_data.dto.DropNotificationResponse;
import com.aps.ficcado_website_data.entity.DropNotification;
import com.aps.ficcado_website_data.entity.enums.NotificationStatus;
import com.aps.ficcado_website_data.repository.DropNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final DropNotificationRepository notificationRepository;

    @Transactional
    public DropNotificationResponse subscribeToDrop(DropNotificationRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String capsuleName = request.getCapsuleName() != null ? request.getCapsuleName().trim().toLowerCase() : "general";

        Optional<DropNotification> existingOpt = notificationRepository.findByEmailAndCapsuleName(email, capsuleName);

        DropNotification notification;
        if (existingOpt.isPresent()) {
            notification = existingOpt.get();
            notification.setStatus(NotificationStatus.ACTIVE);
            if (request.getPhone() != null && !request.getPhone().isBlank()) {
                notification.setPhone(request.getPhone().trim());
            }
            if (request.getInterestCategory() != null) {
                notification.setInterestCategory(request.getInterestCategory().trim());
            }
        } else {
            notification = DropNotification.builder()
                    .email(email)
                    .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                    .capsuleName(capsuleName)
                    .interestCategory(request.getInterestCategory() != null ? request.getInterestCategory().trim() : null)
                    .status(NotificationStatus.ACTIVE)
                    .build();
        }

        notification = notificationRepository.save(notification);
        log.info("[NotificationService] Registered capsule notification signup: email='{}', capsule='{}'", email, capsuleName);

        return DropNotificationResponse.fromEntity(notification);
    }

    @Transactional
    public void unsubscribe(String email, String capsuleName) {
        String normalizedEmail = email.trim().toLowerCase();
        if (capsuleName != null && !capsuleName.isBlank()) {
            notificationRepository.findByEmailAndCapsuleName(normalizedEmail, capsuleName.trim().toLowerCase())
                    .ifPresent(n -> {
                        n.setStatus(NotificationStatus.UNSUBSCRIBED);
                        notificationRepository.save(n);
                    });
        } else {
            notificationRepository.findByEmail(normalizedEmail).forEach(n -> {
                n.setStatus(NotificationStatus.UNSUBSCRIBED);
                notificationRepository.save(n);
            });
        }
        log.info("[NotificationService] Unsubscribed notifications for email='{}', capsule='{}'", normalizedEmail, capsuleName);
    }
}
