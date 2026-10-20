package com.aps.ficcado_website_data.dto;

import com.aps.ficcado_website_data.entity.CustomerEnquiry;
import com.aps.ficcado_website_data.entity.enums.EnquiryCategory;
import com.aps.ficcado_website_data.entity.enums.EnquiryStatus;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnquiryResponse {

    private String ticketId;
    private String fullName;
    private String email;
    private String phone;
    private String orderId;
    private EnquiryCategory category;
    private String subject;
    private String message;
    private EnquiryStatus status;
    private Instant createdAt;

    public static EnquiryResponse fromEntity(CustomerEnquiry entity) {
        return EnquiryResponse.builder()
                .ticketId(entity.getTicketId())
                .fullName(entity.getFullName())
                .email(entity.getEmail())
                .phone(entity.getPhone())
                .orderId(entity.getOrderId())
                .category(entity.getCategory())
                .subject(entity.getSubject())
                .message(entity.getMessage())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
