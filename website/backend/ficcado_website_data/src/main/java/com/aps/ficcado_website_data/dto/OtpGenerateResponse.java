package com.aps.ficcado_website_data.dto;

import com.aps.ficcado_website_data.entity.enums.OtpPurpose;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OtpGenerateResponse {

    private String email;
    private OtpPurpose purpose;
    private long expiresInSeconds;
    private String message;
}
