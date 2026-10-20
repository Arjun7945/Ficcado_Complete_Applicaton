package com.aps.ficcado_website_data.dto;

import com.aps.ficcado_website_data.entity.enums.ComplaintType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintRequest {

    @NotBlank(message = "Customer email is required")
    @Email(message = "Customer email must be valid")
    @Size(max = 255, message = "Customer email must not exceed 255 characters")
    private String customerEmail;

    @Size(max = 20, message = "Customer phone must not exceed 20 characters")
    private String customerPhone;

    @Size(max = 64, message = "Order ID must not exceed 64 characters")
    private String orderId;

    @NotNull(message = "Complaint type is required")
    private ComplaintType complaintType;

    @NotBlank(message = "Complaint description cannot be empty")
    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;
}
