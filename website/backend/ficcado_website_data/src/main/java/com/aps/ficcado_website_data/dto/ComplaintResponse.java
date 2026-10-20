package com.aps.ficcado_website_data.dto;

import com.aps.ficcado_website_data.entity.CustomerComplaint;
import com.aps.ficcado_website_data.entity.enums.ComplaintStatus;
import com.aps.ficcado_website_data.entity.enums.ComplaintType;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintResponse {

    private String complaintId;
    private String customerEmail;
    private String customerPhone;
    private String orderId;
    private ComplaintType complaintType;
    private String description;
    private ComplaintStatus status;
    private String resolutionNotes;
    private Instant createdAt;

    public static ComplaintResponse fromEntity(CustomerComplaint entity) {
        return ComplaintResponse.builder()
                .complaintId(entity.getComplaintId())
                .customerEmail(entity.getCustomerEmail())
                .customerPhone(entity.getCustomerPhone())
                .orderId(entity.getOrderId())
                .complaintType(entity.getComplaintType())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .resolutionNotes(entity.getResolutionNotes())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
