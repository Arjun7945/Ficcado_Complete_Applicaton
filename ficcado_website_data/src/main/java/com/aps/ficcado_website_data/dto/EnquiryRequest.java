package com.aps.ficcado_website_data.dto;

import com.aps.ficcado_website_data.entity.enums.EnquiryCategory;
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
public class EnquiryRequest {

    @NotBlank(message = "Full name is required")
    @Size(max = 150, message = "Full name must not exceed 150 characters")
    private String fullName;

    @NotBlank(message = "Email address is required")
    @Email(message = "Email address must be valid")
    @Size(max = 255, message = "Email address must not exceed 255 characters")
    private String email;

    @Size(max = 20, message = "Phone must not exceed 20 characters")
    private String phone;

    @Size(max = 64, message = "Order ID must not exceed 64 characters")
    private String orderId;

    @NotNull(message = "Enquiry category is required")
    private EnquiryCategory category;

    @NotBlank(message = "Subject is required")
    @Size(max = 200, message = "Subject must not exceed 200 characters")
    private String subject;

    @NotBlank(message = "Message cannot be empty")
    @Size(max = 5000, message = "Message must not exceed 5000 characters")
    private String message;
}
