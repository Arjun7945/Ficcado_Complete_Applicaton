package com.aps.ficcado_website_data.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

/**
 * Service-to-service internal REST client communicating with Ficcado-Data (Port 8081).
 *
 * Uses the shared INTERNAL_API_KEY secret header: X-Internal-Secret.
 * Degradation resilient: If Ficcado-Data is unreachable, catches errors and logs warnings.
 */
@Slf4j
@Component
public class FiccadoDataClient {

    private final RestClient restClient;
    private final String internalApiKey;

    public FiccadoDataClient(
            @Value("${ficcado.data.url:http://localhost:8081}") String ficcadoDataUrl,
            @Value("${app.internal.api-key:ficcado-internal-service-secret-key-change-in-prod}") String internalApiKey) {
        this.restClient = RestClient.builder()
                .baseUrl(ficcadoDataUrl)
                .build();
        this.internalApiKey = internalApiKey;
    }

    /**
     * Executes internal OTP login handshake to generate Customer JWT upon OTP verification.
     */
    public Optional<String> completeCustomerOtpLogin(String email, String phone, String name) {
        try {
            log.info("Sending internal OTP login handshake to Ficcado-Data for email: {}", email);
            Map<?, ?> response = restClient.post()
                    .uri("/api/internal/customer/otp-login")
                    .header("X-Internal-Secret", internalApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "email", email,
                            "phone", phone != null ? phone : "",
                            "name", name != null ? name : ""
                    ))
                    .retrieve()
                    .body(Map.class);

            if (response != null && Boolean.TRUE.equals(response.get("success"))) {
                String token = (String) response.get("token");
                return Optional.ofNullable(token);
            }
        } catch (Exception e) {
            log.warn("Internal OTP login handshake with Ficcado-Data failed: {}", e.getMessage());
        }
        return Optional.empty();
    }
}
