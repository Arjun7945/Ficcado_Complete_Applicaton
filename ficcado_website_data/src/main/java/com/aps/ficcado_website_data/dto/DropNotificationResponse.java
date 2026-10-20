package com.aps.ficcado_website_data.dto;

import com.aps.ficcado_website_data.entity.DropNotification;
import com.aps.ficcado_website_data.entity.enums.NotificationStatus;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DropNotificationResponse {

    private String email;
    private String capsuleName;
    private String interestCategory;
    private NotificationStatus status;
    private Instant createdAt;

    public static DropNotificationResponse fromEntity(DropNotification entity) {
        return DropNotificationResponse.builder()
                .email(entity.getEmail())
                .capsuleName(entity.getCapsuleName())
                .interestCategory(entity.getInterestCategory())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
