package com.aps.ficcado_website_data.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DropNotificationRequest {

    @NotBlank(message = "Email address is required")
    @Email(message = "Email address must be valid")
    @Size(max = 255, message = "Email address must not exceed 255 characters")
    private String email;

    @Size(max = 20, message = "Phone must not exceed 20 characters")
    private String phone;

    @Size(max = 100, message = "Capsule name must not exceed 100 characters")
    private String capsuleName;

    @Size(max = 100, message = "Interest category must not exceed 100 characters")
    private String interestCategory;
}
