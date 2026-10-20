package com.aps.ficcado_website_data.dto;

import com.aps.ficcado_website_data.entity.enums.OtpPurpose;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OtpVerifyResponse {

    private boolean verified;
    private String email;
    private OtpPurpose purpose;
    private String verificationToken;
    private String message;
}
